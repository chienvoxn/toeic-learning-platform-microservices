package com.toeic.assessment.adapters.messaging;

import static com.toeic.assessment.adapters.messaging.F02RabbitFixture.EXCHANGE;
import static com.toeic.assessment.adapters.messaging.F02RabbitFixture.ROUTING_KEY;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.rabbitmq.client.Delivery;
import com.toeic.assessment.core.EventOutbox;
import com.toeic.assessment.data.persistence.OutboxRepo;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

@EnabledIfSystemProperty(named = "toeic.f02.it", matches = "true")
class F02RabbitPublisherIT {
    private final UUID eventId = UUID.randomUUID();
    private final String queue = "f02.publisher." + eventId;
    private final OutboxRepo outbox = mock(OutboxRepo.class);
    private F02RabbitFixture broker;
    private OutboxPublisher publisher;
    private boolean bound;

    @BeforeEach
    void connect() throws Exception {
        broker = new F02RabbitFixture();
        var row = mock(EventOutbox.class);
        when(row.eventId()).thenReturn(eventId);
        when(row.actorId()).thenReturn(UUID.randomUUID());
        when(row.aggregateId()).thenReturn(UUID.randomUUID());
        when(outbox.findTop20ByPublishedFalseOrderByOccurredAtAsc()).thenReturn(List.of(row));
        var transactions = mock(PlatformTransactionManager.class);
        when(transactions.getTransaction(any())).thenAnswer(call -> new SimpleTransactionStatus());
        publisher = new OutboxPublisher(outbox, broker.template, transactions, 5000);
    }

    @AfterEach
    void disconnect() throws Exception {
        if (broker == null) return;
        try (var fixture = broker) {
            if (bound && fixture.primary.isOpen()) fixture.primary.queueDelete(queue);
        }
    }

    @Test
    void routedBrokerAckMarksTheRow() throws Exception {
        bind(Map.of());
        publisher.forward();

        assertTrue(broker.template.brokerConfirm(0).ack());
        assertNull(broker.template.wireConfirms.getFirst().getReturned());
        verify(outbox).markPublished(eventId);
        var delivery = broker.primary.basicGet(queue, true);
        assertNotNull(delivery);
        assertEquals(broker.template.payloads.getFirst(), new String(delivery.getBody(), StandardCharsets.UTF_8));
    }

    @Test
    @EnabledIfSystemProperty(named = "toeic.f02.faults", matches = "true")
    void mandatoryNoRouteIsReturnedEvenThoughBrokerAcks() throws Exception {
        publisher.forward();

        assertTrue(broker.template.brokerConfirm(0).ack());
        var returned = broker.template.wireConfirms.getFirst().getReturned();
        assertNotNull(returned, "The dedicated vhost must have no other binding on the test exchange");
        assertEquals(312, returned.getReplyCode());
        assertEquals(ROUTING_KEY, returned.getRoutingKey());
        verify(outbox, never()).markPublished(any());

        bind(Map.of());
        publisher.forward();
        assertTrue(broker.template.brokerConfirm(1).ack());
        verify(outbox).markPublished(eventId);
        assertSameEventOnRetry();
    }

    @Test
    @EnabledIfSystemProperty(named = "toeic.f02.faults", matches = "true")
    void fullRejectPublishQueueProducesABrokerNack() throws Exception {
        bind(Map.of("x-max-length", 1, "x-overflow", "reject-publish"));
        broker.template.convertAndSend(EXCHANGE, ROUTING_KEY, "filler", new CorrelationData(UUID.randomUUID().toString()));
        assertTrue(broker.template.brokerConfirm(0).ack());
        assertEquals(1, broker.primary.queueDeclarePassive(queue).getMessageCount());

        publisher.forward();
        assertFalse(broker.template.brokerConfirm(1).ack());
        assertNull(broker.template.wireConfirms.get(1).getReturned());
        verify(outbox, never()).markPublished(any());

        assertNotNull(broker.primary.basicGet(queue, true));
        publisher.forward();
        assertTrue(broker.template.brokerConfirm(2).ack());
        verify(outbox).markPublished(eventId);
        assertEquals(broker.template.payloads.get(1), broker.template.payloads.get(2));
    }

    @Test
    @EnabledIfSystemProperty(named = "toeic.f02.faults", matches = "true")
    void droppedConfirmResetsPublisherWhileConsumerRemainsConnected() throws Exception {
        bind(Map.of());
        var deliveries = new LinkedBlockingQueue<Delivery>();
        var cancellations = new LinkedBlockingQueue<String>();
        String consumer = broker.primary.basicConsume(queue, false,
                (tag, delivery) -> deliveries.add(delivery), cancellations::add);
        var primary = broker.primaryConnection();
        var originalPublisher = broker.publisherConnection();
        assertNotSame(primary, originalPublisher);
        broker.template.withholdFirstConfirm = true;

        publisher.forward();
        var realAck = broker.template.brokerConfirm(0);
        assertTrue(realAck.ack());
        assertFalse(broker.template.withheld.getFuture().isDone());
        verify(outbox, never()).markPublished(any());
        var first = deliveries.poll(10, TimeUnit.SECONDS);
        assertNotNull(first);
        broker.primary.basicAck(first.getEnvelope().getDeliveryTag(), false);

        publisher.forward();
        assertTrue(broker.template.brokerConfirm(1).ack());
        assertFalse(originalPublisher.isOpen());
        assertNotSame(originalPublisher, broker.publisherConnection());
        assertSame(primary, broker.primaryConnection());
        assertTrue(primary.isOpen());
        assertTrue(broker.primary.isOpen());
        var second = deliveries.poll(10, TimeUnit.SECONDS);
        assertNotNull(second);
        assertArrayEquals(first.getBody(), second.getBody());
        broker.primary.basicAck(second.getEnvelope().getDeliveryTag(), false);
        assertTrue(cancellations.isEmpty());
        broker.primary.basicCancel(consumer);
        verify(outbox).markPublished(eventId);
        broker.template.withheld.getFuture().complete(realAck);
        verify(outbox).markPublished(eventId);
        assertSameEventOnRetry();
    }

    private void bind(Map<String, Object> arguments) throws Exception {
        broker.bind(queue, arguments);
        bound = true;
    }

    private void assertSameEventOnRetry() {
        assertEquals(broker.template.payloads.get(0), broker.template.payloads.get(1));
        assertTrue(broker.template.payloads.getFirst().contains(eventId.toString()));
        assertNotEquals(broker.template.wireConfirms.get(0).getId(), broker.template.wireConfirms.get(1).getId());
    }
}
