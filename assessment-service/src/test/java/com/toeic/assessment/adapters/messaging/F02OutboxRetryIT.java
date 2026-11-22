package com.toeic.assessment.adapters.messaging;

import static org.junit.jupiter.api.Assertions.*;

import com.toeic.assessment.core.EventOutbox;
import com.toeic.assessment.data.persistence.OutboxRepo;
import java.util.Map;
import java.util.UUID;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.flyway.autoconfigure.FlywayAutoConfiguration;
import org.springframework.boot.hibernate.autoconfigure.HibernateJpaAutoConfiguration;
import org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;

@EnabledIfSystemProperty(named = "toeic.f02.it", matches = "true")
@EnabledIfSystemProperty(named = "toeic.f02.faults", matches = "true")
@SpringBootTest(classes = F02OutboxRetryIT.Persistence.class, webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = {"spring.config.name=f02-integration", "spring.datasource.username=f02_it",
                "spring.datasource.hikari.maximum-pool-size=2", "spring.datasource.hikari.minimum-idle=0",
                "spring.jpa.hibernate.ddl-auto=validate", "spring.flyway.enabled=true"})
class F02OutboxRetryIT {
    private static final String SCHEMA = "f02_assessment_" + UUID.randomUUID().toString().replace("-", "");

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
    @EntityScan(basePackageClasses = EventOutbox.class)
    @EnableJpaRepositories(basePackageClasses = OutboxRepo.class)
    static class Persistence {}

    @Autowired DataSource dataSource;
    @Autowired OutboxRepo outbox;
    @Autowired PlatformTransactionManager transactions;

    @Test
    void realAckThenDeferredCommitFailureRetriesTheSameEventForInteraction() throws Exception {
        var jdbc = new JdbcTemplate(dataSource);
        assertEquals("f02_it", jdbc.queryForObject("select current_database()", String.class));
        assertEquals("f02_it", jdbc.queryForObject("select current_user", String.class));
        assertEquals(SCHEMA, jdbc.queryForObject("select current_schema()", String.class));
        assertEquals(17, jdbc.queryForObject("select current_setting('server_version_num')::int / 10000", Integer.class));
        String queue = System.getenv("F02_RETRY_QUEUE");
        assertTrue(queue != null && queue.matches("f02\\.retry\\.[0-9a-f]{32}"), "Set a fresh F02_RETRY_QUEUE fixture name");
        UUID eventId = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO event_outbox(event_id, aggregate_id, actor_id, event_type, occurred_at)
                VALUES (?, ?, ?, 'AttemptGraded', CURRENT_TIMESTAMP)
                """, eventId, UUID.randomUUID(), UUID.randomUUID());

        try (var broker = new F02RabbitFixture()) {
            broker.bind(queue, Map.of());
            assertEquals(0, broker.primary.queueDeclarePassive(queue).getMessageCount(), "Use a fresh retry queue");
            var publisher = new OutboxPublisher(outbox, broker.template, transactions, 5000);
            jdbc.execute("""
                    CREATE FUNCTION f02_reject_publish_commit() RETURNS trigger LANGUAGE plpgsql AS $$
                    BEGIN
                      RAISE EXCEPTION 'F02 simulated deferred commit failure' USING ERRCODE = '23514';
                    END;
                    $$
                    """);
            jdbc.execute("""
                    CREATE CONSTRAINT TRIGGER f02_reject_publish_commit
                    AFTER UPDATE ON event_outbox DEFERRABLE INITIALLY DEFERRED
                    FOR EACH ROW WHEN (NEW.published)
                    EXECUTE FUNCTION f02_reject_publish_commit()
                    """);
            try {
                publisher.forward();
                assertTrue(broker.template.brokerConfirm(0).ack());
                assertNull(broker.template.wireConfirms.getFirst().getReturned());
                assertEquals(Boolean.FALSE, jdbc.queryForObject("SELECT published FROM event_outbox WHERE event_id = ?",
                        Boolean.class, eventId));
                assertEquals(1, broker.primary.queueDeclarePassive(queue).getMessageCount());
            } finally {
                jdbc.execute("DROP TRIGGER f02_reject_publish_commit ON event_outbox");
            }

            publisher.forward();
            assertTrue(broker.template.brokerConfirm(1).ack());
            assertEquals(Boolean.TRUE, jdbc.queryForObject("SELECT published FROM event_outbox WHERE event_id = ?",
                    Boolean.class, eventId));
            assertEquals(2, broker.primary.queueDeclarePassive(queue).getMessageCount());
            assertEquals(broker.template.payloads.get(0), broker.template.payloads.get(1));
            assertTrue(broker.template.payloads.getFirst().contains(eventId.toString()));
            assertNotEquals(broker.template.wireConfirms.get(0).getId(), broker.template.wireConfirms.get(1).getId());
            System.out.printf("F-02 handoff eventId=%s queue=%s schema=%s%n", eventId, queue, SCHEMA);
        }
    }
}
