package com.toeic.assessment.adapters.http;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;

class QuizClientSnapshotOrderTest {
    private static final UUID QUIZ = UUID.fromString("12345678-1234-1234-1234-1234567890ab");
    private static final UUID FIRST = UUID.fromString("ffffffff-ffff-ffff-ffff-ffffffffffff");
    private static final UUID SECOND = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID THIRD = UUID.fromString("00000000-0000-0000-0000-000000000002");

    @Test
    void snapshotWithoutPositionsPreservesContentArrayOrder() throws IOException {
        assertSnapshotOrder("", "", "");
    }

    @Test
    void duplicateAndMissingPositionFieldsDoNotChangeSnapshotArrayOrder() throws IOException {
        assertSnapshotOrder(",\"position\":4", ",\"position\":4", "");
    }

    private void assertSnapshotOrder(String firstPosition, String secondPosition, String thirdPosition) throws IOException {
        String payload = """
                {"quiz":{"premium":false},"questions":[
                  {"id":"%s","prompt":"First","choices":{"A":"One","B":"Two","C":"Three","D":"Four"},"correctChoice":"B","explanation":"Why B"%s},
                  {"id":"%s","prompt":"Second","choices":{"A":"One","B":"Two","C":"Three","D":"Four"},"correctChoice":"A","explanation":"Why A"%s},
                  {"id":"%s","prompt":"Third","choices":{"A":"One","B":"Two","C":"Three","D":"Four"},"correctChoice":"C","explanation":"Why C"%s}
                ]}
                """.formatted(FIRST, firstPosition, SECOND, secondPosition, THIRD, thirdPosition);
        byte[] response = payload.getBytes(StandardCharsets.UTF_8);
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/ms/v1/contents/quizzes/internal/" + QUIZ + "/snapshot", exchange -> {
            try (exchange) {
                exchange.sendResponseHeaders(200, response.length);
                exchange.getResponseBody().write(response);
            }
        });
        server.start();
        try {
            String origin = "http://127.0.0.1:" + server.getAddress().getPort();
            var snapshot = new QuizClient(new ObjectMapper(), origin, origin, "fixture-key").snapshot(QUIZ);
            assertEquals(List.of(FIRST, SECOND, THIRD), snapshot.questions().stream().map(QuizClient.QuizQuestion::id).toList());
            assertEquals(new QuizClient.QuizQuestion(FIRST, "First",
                    Map.of("A", "One", "B", "Two", "C", "Three", "D", "Four"), "B", "Why B"),
                    snapshot.questions().getFirst());
        } finally {
            server.stop(0);
        }
    }
}
