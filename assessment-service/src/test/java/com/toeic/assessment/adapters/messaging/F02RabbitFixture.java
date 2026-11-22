package com.toeic.assessment.adapters.messaging;

import static org.junit.jupiter.api.Assertions.assertTrue;

import com.rabbitmq.client.Channel;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import org.springframework.amqp.rabbit.connection.CachingConnectionFactory;
import org.springframework.amqp.rabbit.connection.Connection;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

final class F02RabbitFixture implements AutoCloseable {
    static final String EXCHANGE = "toeic.events";
    static final String ROUTING_KEY = "attempt.graded";

    final CachingConnectionFactory factory = new CachingConnectionFactory("127.0.0.1", 55672);
    final RecordingTemplate template = new RecordingTemplate(factory);
    private final Connection connection;
    final Channel primary;

    F02RabbitFixture() throws Exception {
        String password = System.getenv("F02_RABBIT_PASSWORD");
        assertTrue(password != null && !password.isBlank(), "Set F02_RABBIT_PASSWORD for the isolated broker");
        factory.setUsername("f02_it");
        factory.setVirtualHost("f02_it");
        factory.setPassword(password);
        factory.setConnectionTimeout(5000);
        factory.setPublisherConfirmType(CachingConnectionFactory.ConfirmType.CORRELATED);
        factory.setPublisherReturns(true);
        template.setMandatory(true);
        template.setUsePublisherConnection(true);
        try {
            connection = factory.createConnection();
            primary = connection.createChannel(false);
            String version = connection.getDelegate().getServerProperties().get("version").toString();
            assertTrue(version.startsWith("3.13."), "Use the isolated RabbitMQ 3.13 fixture");
            primary.exchangeDeclare(EXCHANGE, "topic", true);
        } catch (Exception | AssertionError failure) {
            factory.destroy();
            throw failure;
        }
    }

    void bind(String queue, Map<String, Object> arguments) throws Exception {
        primary.queueDeclare(queue, true, false, false, arguments);
        primary.queueBind(queue, EXCHANGE, ROUTING_KEY);
    }

    com.rabbitmq.client.Connection primaryConnection() {
        return connection.getDelegate();
    }

    com.rabbitmq.client.Connection publisherConnection() {
        return factory.getPublisherConnectionFactory().createConnection().getDelegate();
    }

    @Override
    public void close() throws Exception {
        try {
            if (primary.isOpen()) primary.close();
        } finally {
            factory.destroy();
        }
    }

    static final class RecordingTemplate extends RabbitTemplate {
        final List<String> payloads = new ArrayList<>();
        final List<CorrelationData> wireConfirms = new ArrayList<>();
        boolean withholdFirstConfirm;
        CorrelationData withheld;

        RecordingTemplate(CachingConnectionFactory factory) {
            super(factory);
        }

        @Override
        public void convertAndSend(String exchange, String routingKey, Object message, CorrelationData correlation) {
            payloads.add((String) message);
            CorrelationData wireCorrelation = correlation;
            if (withholdFirstConfirm && wireConfirms.isEmpty()) {
                withheld = correlation;
                // Process the real broker confirm, but deliberately do not relay it to the worker.
                wireCorrelation = new CorrelationData(correlation.getId());
            }
            wireConfirms.add(wireCorrelation);
            super.convertAndSend(exchange, routingKey, message, wireCorrelation);
        }

        CorrelationData.Confirm brokerConfirm(int index) throws Exception {
            return wireConfirms.get(index).getFuture().get(10, TimeUnit.SECONDS);
        }
    }
}
