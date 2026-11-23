package com.toeic.content.entrypoints;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import org.flywaydb.core.Flyway;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import com.sun.net.httpserver.HttpServer;
import com.toeic.content.adapters.security.TokenService;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@EnabledIfEnvironmentVariable(named = "TOEIC_CONTENT_TEST_DB_URL", matches = "jdbc:postgresql:.*")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "auth.jwt-secret=phase3b-fixture-key-for-isolated-content-tests",
        "services.internal-key=phase3b-fixture-internal-key"
})
class QuizAuthoringTest {
    private static final String ROOT = "/ms/v1/contents/quizzes";
    private static final String SEED = "11111111-1111-1111-1111-111111111111";
    private static final UUID TEACHER_A = UUID.randomUUID();
    private static final UUID TEACHER_B = UUID.randomUUID();
    private static final UUID LEARNER = UUID.randomUUID();
    private static String testSchema;
    @LocalServerPort int port;
    @Autowired TokenService tokens;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    private final HttpClient http = HttpClient.newHttpClient();

    @DynamicPropertySource
    static void postgres(DynamicPropertyRegistry properties) {
        String url = System.getenv("TOEIC_CONTENT_TEST_DB_URL");
        if (!url.matches("jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/phase3b_[a-z0-9_]+")) {
            throw new IllegalArgumentException("Use a loopback PostgreSQL fixture database named phase3b_*");
        }
        String user = System.getenv("TOEIC_CONTENT_TEST_DB_USER");
        String password = System.getenv().getOrDefault("TOEIC_CONTENT_TEST_DB_PASSWORD", "");
        String schema = "phase3b_" + UUID.randomUUID().toString().replace("-", "");
        testSchema = schema;
        Flyway.configure().dataSource(url, user, password).schemas(schema).target("2").load().migrate();
        properties.add("spring.datasource.url", () -> url);
        properties.add("spring.datasource.username", () -> user);
        properties.add("spring.datasource.password", () -> password);
        properties.add("spring.flyway.schemas", () -> schema);
        properties.add("spring.jpa.properties.hibernate.default_schema", () -> schema);
    }

    @Test
    void legacySeedKeepsPublicOrderAndAppearsInNoTeacherList() throws Exception {
        JsonNode detail = body(request("GET", "/" + SEED, null, null), 200);
        assertEquals("11111111-aaaa-aaaa-aaaa-111111111111", detail.at("/questions/0/id").asText());
        assertEquals("11111111-bbbb-bbbb-bbbb-111111111111", detail.at("/questions/1/id").asText());
        assertEquals("11111111-cccc-cccc-cccc-111111111111", detail.at("/questions/2/id").asText());
        assertTrue(body(request("GET", "/mine", teacher(TEACHER_A), null), 200)
                .findValuesAsString("id").stream().noneMatch(SEED::equals));
    }

    @Test
    void draftOwnershipVisibilityAndVersionedPublishPreserveOrder() throws Exception {
        String author = teacher(TEACHER_A);
        String other = teacher(TEACHER_B);
        String learner = tokens.issue(LEARNER, "LEARNER");
        Map<String, Object> first = question("First");
        Map<String, Object> second = question("Second");
        Map<String, Object> input = quiz("QA lifecycle", List.of(first, second));
        assertEquals(403, request("POST", "/drafts", learner, input).statusCode());
        JsonNode created = body(request("POST", "/drafts", author, input), 200);
        String id = created.at("/quiz/id").asText();
        String draft = "/" + id + "/draft";
        String publish = "/" + id + "/publish";
        assertEquals("DRAFT", created.at("/quiz/status").asText());
        assertEquals(0, created.at("/quiz/version").asLong());
        assertEquals(404, request("GET", draft, other, null).statusCode());
        assertEquals(404, request("PUT", draft, other, Map.of("version", 0, "quiz", input)).statusCode());
        assertEquals(404, request("POST", publish, other, Map.of("version", 0)).statusCode());
        assertEquals(403, request("POST", publish, learner, Map.of("version", 0)).statusCode());
        assertEquals(404, request("GET", "/" + id, null, null).statusCode());
        assertEquals(404, snapshot(id).statusCode());
        assertFalse(body(request("GET", "", null, null), 200).findValuesAsString("id").contains(id));
        assertFalse(body(request("GET", "/mine", other, null), 200).findValuesAsString("id").contains(id));
        assertTrue(body(request("GET", "/mine", author, null), 200).findValuesAsString("id").contains(id));

        var reordered = quiz("QA reordered", List.of(second, first));
        var update = Map.of("version", 0, "quiz", reordered);
        var left = send("PUT", draft, author, update);
        var competing = quiz("QA competing update", List.of(second, question("Different content")));
        var right = send("PUT", draft, author, Map.of("version", 0, "quiz", competing));
        var leftResult = left.join();
        var rightResult = right.join();
        var statuses = List.of(leftResult.statusCode(), rightResult.statusCode()).stream().sorted().toList();
        assertEquals(List.of(200, 409), statuses);
        JsonNode loaded = body(request("GET", draft, author, null), 200);
        assertEquals(1, loaded.at("/quiz/version").asLong());
        assertEquals(body(leftResult.statusCode() == 200 ? leftResult : rightResult, 200), loaded);
        assertEquals(2, body(request("PUT", draft, author, Map.of("version", 1, "quiz", reordered)), 200)
                .at("/quiz/version").asLong());

        assertEquals(409, request("POST", publish, author, Map.of("version", 1)).statusCode());
        assertEquals("PUBLISHED", body(request("POST", publish, author, Map.of("version", 2)), 200).get("status").asText());
        assertEquals(409, request("PUT", draft, author, Map.of("version", 3, "quiz", input)).statusCode());
        assertEquals(409, request("POST", publish, author, Map.of("version", 3)).statusCode());
        assertTrue(body(request("GET", "", null, null), 200).findValuesAsString("id").contains(id));
        JsonNode publicDetail = body(request("GET", "/" + id, null, null), 200);
        assertEquals(List.of("Second", "First"), publicDetail.at("/questions").findValuesAsString("prompt"));
        assertTrue(publicDetail.at("/questions/0/correctChoice").isMissingNode());
        JsonNode snap = body(snapshot(id), 200);
        assertEquals(List.of("Second", "First"), snap.at("/questions").findValuesAsString("prompt"));
        assertEquals("A", snap.at("/questions/0/correctChoice").asText());
        assertEquals(publicDetail.at("/questions").findValuesAsString("id"), snap.at("/questions").findValuesAsString("id"));
    }

    @Test
    void failedReplacementRollsBackDeletedRowsPartialInsertAndVersion() {
        String author = teacher(TEACHER_A);
        var input = quiz("QA rollback original", List.of(question("Original first"), question("Original second")));
        JsonNode created = body(request("POST", "/drafts", author, input), 200);
        UUID quiz = UUID.fromString(created.at("/quiz/id").asText());
        String draft = "/" + quiz + "/draft";
        var storedBefore = storedQuestions(quiz);

        // Sequence calls survive rollback, so the witness distinguishes an actual partial write
        // from a rejected request that never got as far as replacing questions.
        jdbc.execute("CREATE SEQUENCE " + testSchema + ".rollback_witness");
        jdbc.execute("""
                CREATE FUNCTION %1$s.reject_second_replacement() RETURNS trigger LANGUAGE plpgsql AS $$
                BEGIN
                    IF NEW.quiz_id = '%2$s'::uuid AND NEW.position = 2 AND NEW.prompt = 'Replacement second' THEN
                        IF EXISTS (SELECT 1 FROM %1$s.toeic_questions
                                   WHERE quiz_id = NEW.quiz_id AND position = 1 AND prompt = 'Replacement first')
                           AND NOT EXISTS (SELECT 1 FROM %1$s.toeic_questions
                                           WHERE quiz_id = NEW.quiz_id AND prompt LIKE 'Original %%') THEN
                            PERFORM nextval('%1$s.rollback_witness'::regclass);
                            RAISE EXCEPTION 'phase3b forced failure after delete and first insert';
                        END IF;
                        RAISE EXCEPTION 'phase3b test did not reach the partial-write boundary';
                    END IF;
                    RETURN NEW;
                END;
                $$
                """.formatted(testSchema, quiz));
        jdbc.execute("""
                CREATE TRIGGER phase3b_replacement_failure BEFORE INSERT ON %1$s.toeic_questions
                FOR EACH ROW EXECUTE FUNCTION %1$s.reject_second_replacement()
                """.formatted(testSchema));

        var replacement = quiz("QA replacement", List.of(question("Replacement first"), question("Replacement second")));
        assertEquals(500, request("PUT", draft, author, Map.of("version", 0, "quiz", replacement)).statusCode());
        assertEquals(Boolean.TRUE, jdbc.queryForObject("SELECT is_called FROM " + testSchema + ".rollback_witness", Boolean.class));
        assertEquals(storedBefore, storedQuestions(quiz), "Existing IDs, positions and question content survive rollback");
        assertEquals(created, body(request("GET", draft, author, null), 200), "Title, question order and version survive rollback");

        var retryInput = quiz("QA retry", List.of(question("Retry first"), question("Retry second")));
        var retry = request("PUT", draft, author, Map.of("version", 0, "quiz", retryInput));
        assertEquals(1, body(retry, 200).at("/quiz/version").asLong());
        System.out.println("QA Phase 3B rollback: after delete and first insert, HTTP 500 restored rows and version; version 0 retry succeeded.");
    }

    @Test
    void publishResponseLossIsReconciledThroughMineAndCannotBeReplayedAsAWrite() throws Exception {
        String author = teacher(TEACHER_A);
        var input = quiz("QA publish lost response", List.of(question("Publish once")));
        String id = body(request("POST", "/drafts", author, input), 200).at("/quiz/id").asText();
        String publish = "/" + id + "/publish";
        var backendStatus = new CompletableFuture<Integer>();
        var proxy = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        proxy.createContext("/publish", exchange -> {
            try (exchange) {
                backendStatus.complete(request("POST", publish, author, Map.of("version", 0)).statusCode());
                // Close the client connection without forwarding the committed response.
            } catch (RuntimeException error) {
                backendStatus.completeExceptionally(error);
            }
        });
        proxy.start();
        try {
            var client = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + proxy.getAddress().getPort() + "/publish"))
                    .timeout(Duration.ofSeconds(15)).POST(HttpRequest.BodyPublishers.ofString("{\"version\":0}")).build();
            assertThrows(IOException.class, () -> http.send(client, HttpResponse.BodyHandlers.discarding()));
            assertEquals(200, backendStatus.orTimeout(15, java.util.concurrent.TimeUnit.SECONDS).join());
        } finally {
            proxy.stop(0);
        }

        JsonNode committed = ownQuiz(author, id);
        assertEquals("PUBLISHED", committed.get("status").asText());
        assertEquals(1, committed.get("version").asLong());
        assertEquals(409, request("POST", publish, author, Map.of("version", 0)).statusCode());
        assertEquals(409, request("PUT", "/" + id + "/draft", author, Map.of("version", 1,
                "quiz", quiz("QA must not replace published", List.of(question("Changed"))))).statusCode());
        assertEquals(committed, ownQuiz(author, id));
        assertEquals(List.of("Publish once"), body(snapshot(id), 200).at("/questions").findValuesAsString("prompt"));
        System.out.println("QA Phase 3B publish: response dropped, /mine showed PUBLISHED v1, replay and draft edit returned 409.");
    }

    private List<String> storedQuestions(UUID quiz) {
        return jdbc.queryForList("SELECT to_jsonb(q)::text FROM " + testSchema +
                ".toeic_questions q WHERE quiz_id=? ORDER BY position", String.class, quiz);
    }

    private JsonNode ownQuiz(String author, String id) {
        var found = body(request("GET", "/mine", author, null), 200).valueStream()
                .filter(quiz -> id.equals(quiz.get("id").asText())).toList();
        assertEquals(1, found.size());
        return found.getFirst();
    }

    @Test
    void incompleteDraftIsSavedButCannotPublishAndLegacyCreateStillPublishes() throws Exception {
        String author = teacher(TEACHER_A);
        var empty = quiz("", List.of());
        var draft = body(request("POST", "/drafts", author, empty), 200);
        String id = draft.at("/quiz/id").asText();
        assertEquals(400, request("POST", "/" + id + "/publish", author, Map.of("version", 0)).statusCode());
        var longTitle = quiz("x".repeat(256), List.of(question("Prompt")));
        assertEquals(400, request("POST", "/drafts", author, longTitle).statusCode());
        assertEquals(400, request("POST", "/drafts", author, quiz("Too many", java.util.Collections.nCopies(201, question("Prompt")))).statusCode());
        var invalid = new java.util.HashMap<>(question("Bad answer"));
        invalid.put("answer", "X");
        assertEquals(400, request("POST", "/drafts", author, quiz("Invalid", List.of(invalid))).statusCode());
        invalid.put("answer", "");
        assertEquals(400, request("POST", "", author, quiz("Invalid", List.of(invalid))).statusCode());
        var legacy = body(request("POST", "", author, quiz("QA immediate", List.of(question("Legacy")))), 200);
        String legacyId = legacy.get("id").asText();
        assertEquals(1, legacy.get("count").asInt());
        assertTrue(legacy.get("status") == null);
        assertEquals(200, request("GET", "/" + legacyId, null, null).statusCode());
        assertTrue(body(request("GET", "/mine", author, null), 200).findValuesAsString("id").contains(legacyId));
    }

    private String teacher(UUID user) {
        return tokens.issue(user, "TEACHER");
    }

    private Map<String, Object> quiz(String title, List<Map<String, Object>> questions) {
        return Map.of("title", title, "part", 5, "premium", false, "questions", questions);
    }

    private Map<String, Object> question(String prompt) {
        return Map.of("prompt", prompt, "a", "one", "b", "two", "c", "three", "d", "four",
                "answer", "A", "explanation", "Explanation");
    }

    private HttpResponse<String> snapshot(String id) throws Exception {
        return http.send(HttpRequest.newBuilder(uri("/internal/" + id + "/snapshot"))
                .header("X-Service-Key", "phase3b-fixture-internal-key").GET().build(), HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> request(String method, String path, String token, Object data) {
        return send(method, path, token, data).join();
    }

    private CompletableFuture<HttpResponse<String>> send(String method, String path, String token, Object data) {
        var request = HttpRequest.newBuilder(uri(path)).timeout(Duration.ofSeconds(15))
                .header("Content-Type", "application/json");
        if (token != null) request.header("Authorization", "Bearer " + token);
        request.method(method, data == null ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(data)));
        return http.sendAsync(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    private JsonNode body(HttpResponse<String> response, int status) {
        assertEquals(status, response.statusCode(), response.body());
        return json.readTree(response.body());
    }

    private URI uri(String path) {
        return URI.create("http://127.0.0.1:" + port + ROOT + path);
    }
}
