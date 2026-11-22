package com.toeic.interaction.adapters.messaging;

import static org.junit.jupiter.api.Assertions.*;

import com.rabbitmq.client.ConnectionFactory;
import com.toeic.interaction.core.LearningActivity;
import com.toeic.interaction.data.persistence.ActivityRepo;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.flyway.autoconfigure.FlywayAutoConfiguration;
import org.springframework.boot.hibernate.autoconfigure.HibernateJpaAutoConfiguration;
import org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

@EnabledIfSystemProperty(named = "toeic.f02.it", matches = "true")
@SpringBootTest(classes = F02InteractionPostgresIT.Persistence.class, webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = {"spring.config.name=f02-integration", "spring.datasource.username=f02_it",
                "spring.datasource.hikari.maximum-pool-size=3", "spring.datasource.hikari.minimum-idle=0",
                "spring.jpa.hibernate.ddl-auto=validate", "spring.flyway.enabled=true"})
class F02InteractionPostgresIT {
    private static final String SCHEMA = "f02_interaction_" + UUID.randomUUID().toString().replace("-", "");

    @DynamicPropertySource
    static void isolatedSchema(DynamicPropertyRegistry properties) {
        String password = System.getenv("F02_POSTGRES_PASSWORD");
        assertTrue(password != null && !password.isBlank(), "Set F02_POSTGRES_PASSWORD for the isolated database");
        properties.add("spring.datasource.password", () -> password);
        properties.add("spring.datasource.url", () -> "jdbc:postgresql://127.0.0.1:55432/f02_it?currentSchema=" + SCHEMA
                + "&connectTimeout=5&socketTimeout=20");
        properties.add("spring.flyway.schemas", () -> SCHEMA);
        properties.add("spring.jpa.properties.hibernate.default_schema", () -> SCHEMA);
    }

    @Configuration(proxyBeanMethods = false)
    @ImportAutoConfiguration({DataSourceAutoConfiguration.class, HibernateJpaAutoConfiguration.class, FlywayAutoConfiguration.class})
    @EntityScan(basePackageClasses = LearningActivity.class)
    @EnableJpaRepositories(basePackageClasses = ActivityRepo.class)
    @EnableTransactionManagement
    @Import(ActivityConsumer.class)
    static class Persistence {
        @Bean
        ObjectMapper objectMapper() {
            return new ObjectMapper();
        }
    }

    @Autowired DataSource dataSource;
    @Autowired ActivityRepo activities;
    @Autowired PlatformTransactionManager transactions;
    @Autowired ActivityConsumer consumer;
    @Autowired ObjectMapper json;
    private JdbcTemplate jdbc;

    @BeforeEach
    void verifyTestDatabase() {
        jdbc = new JdbcTemplate(dataSource);
        assertEquals("f02_it", jdbc.queryForObject("select current_database()", String.class));
        assertEquals("f02_it", jdbc.queryForObject("select current_user", String.class));
        assertEquals(SCHEMA, jdbc.queryForObject("select current_schema()", String.class));
        assertEquals(17, jdbc.queryForObject("select current_setting('server_version_num')::int / 10000", Integer.class));
    }

    @Test
    void twoRealTransactionsCommitWithOneInsertAndOneNoOp() throws Exception {
        UUID eventId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID attemptId = UUID.randomUUID();
        var overlap = new CyclicBarrier(2);
        var transaction = new TransactionTemplate(transactions);
        transaction.setTimeout(15);
        Callable<Insert> insert = () -> transaction.execute(status -> {
            long transactionId = jdbc.queryForObject("select txid_current()", Long.class);
            try {
                overlap.await(8, TimeUnit.SECONDS);
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
                throw new AssertionError("Interrupted at transaction barrier", interrupted);
            } catch (java.util.concurrent.BrokenBarrierException | java.util.concurrent.TimeoutException failure) {
                throw new AssertionError("Both PostgreSQL transactions must overlap", failure);
            }
            return new Insert(transactionId, activities.insertAttemptGradedIfAbsent(eventId, userId, attemptId));
        });

        try (var executor = Executors.newFixedThreadPool(2)) {
            var commits = executor.invokeAll(List.of(insert, insert), 20, TimeUnit.SECONDS);
            Insert first = commits.get(0).get();
            Insert second = commits.get(1).get();
            assertNotEquals(first.transactionId(), second.transactionId());
            assertEquals(Set.of(0, 1), Set.of(first.rows(), second.rows()));
        }
        assertActivity(eventId, userId, attemptId);
    }

    @Test
    @EnabledIfSystemProperty(named = "toeic.f02.faults", matches = "true")
    void duplicateWireDeliveriesFromTheRetryHandoffCommitOneActivity() throws Exception {
        String queue = System.getenv("F02_RETRY_QUEUE");
        String password = System.getenv("F02_RABBIT_PASSWORD");
        assertTrue(queue != null && queue.matches("f02\\.retry\\.[0-9a-f]{32}"), "Use the Assessment handoff queue");
        assertTrue(password != null && !password.isBlank(), "Set F02_RABBIT_PASSWORD for the isolated broker");
        var rabbit = new ConnectionFactory();
        rabbit.setHost("127.0.0.1");
        rabbit.setPort(55672);
        rabbit.setUsername("f02_it");
        rabbit.setPassword(password);
        rabbit.setVirtualHost("f02_it");
        rabbit.setConnectionTimeout(5000);
        try (var connection = rabbit.newConnection(); var channel = connection.createChannel()) {
            assertTrue(connection.getServerProperties().get("version").toString().startsWith("3.13."));
            assertEquals(2, channel.queueDeclarePassive(queue).getMessageCount(), "Run Assessment handoff first");
            var first = channel.basicGet(queue, false);
            var second = channel.basicGet(queue, false);
            assertNotNull(first);
            assertNotNull(second);
            assertArrayEquals(first.getBody(), second.getBody());
            var event = json.readTree(first.getBody());
            UUID eventId = UUID.fromString(event.path("eventId").asText());
            UUID userId = UUID.fromString(event.path("userId").asText());
            UUID attemptId = UUID.fromString(event.path("attemptId").asText());
            assertEquals("AttemptGraded", event.path("type").asText());

            consumer.handle(new String(first.getBody(), StandardCharsets.UTF_8));
            assertActivity(eventId, userId, attemptId);
            var firstRecordedAt = activities.findById(eventId).orElseThrow().getRecordedAt();
            consumer.handle(new String(second.getBody(), StandardCharsets.UTF_8));
            assertActivity(eventId, userId, attemptId);
            assertEquals(firstRecordedAt, activities.findById(eventId).orElseThrow().getRecordedAt());
            channel.basicAck(second.getEnvelope().getDeliveryTag(), true);
            assertEquals(0, channel.queueDeclarePassive(queue).getMessageCount());
            channel.queueDelete(queue, true, true);
            System.out.printf("F-02 Interaction eventId=%s queue=%s schema=%s%n", eventId, queue, SCHEMA);
        }
    }

    private void assertActivity(UUID eventId, UUID userId, UUID attemptId) {
        assertEquals(1L, jdbc.queryForObject("select count(*) from learning_activities where event_id = ?", Long.class, eventId));
        var row = activities.findById(eventId).orElseThrow();
        assertEquals(userId, row.getUserId());
        assertEquals(attemptId, row.getAttemptId());
        assertEquals("ATTEMPT_GRADED", row.getKind());
        assertNotNull(row.getRecordedAt());
    }

    private record Insert(long transactionId, int rows) {}
}
