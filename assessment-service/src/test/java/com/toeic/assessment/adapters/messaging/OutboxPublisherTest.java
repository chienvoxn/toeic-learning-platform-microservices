package com.toeic.assessment.adapters.messaging;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.toeic.assessment.core.EventOutbox;
import com.toeic.assessment.data.persistence.OutboxRepo;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.function.BiConsumer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.ReturnedMessage;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.boot.amqp.autoconfigure.RabbitAutoConfiguration;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.test.context.support.TestPropertySourceUtils;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionSystemException;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionSynchronizationManager;

class OutboxPublisherTest {
    private static final String EXCHANGE = "toeic.events";
    private static final String ROUTING_KEY = "attempt.graded";
    private final UUID eventId = UUID.randomUUID();
    private final UUID userId = UUID.randomUUID();
    private final UUID attemptId = UUID.randomUUID();
    private final OutboxRepo outbox = mock(OutboxRepo.class);
    private final RabbitTemplate rabbit = mock(RabbitTemplate.class);
    private final ConnectionFactory connection = mock(ConnectionFactory.class);
    private final ConnectionFactory publisherConnection = mock(ConnectionFactory.class);
    private final RecordingTransactions transactions = new RecordingTransactions();
    private final List<CorrelationData> correlations = new ArrayList<>();
    private final List<String> payloads = new ArrayList<>();
    private OutboxPublisher publisher;

    @BeforeEach
    void setUp() {
        when(rabbit.getConnectionFactory()).thenReturn(connection);
        when(rabbit.isUsePublisherConnection()).thenReturn(true);
        when(rabbit.isMandatoryFor(any(Message.class))).thenReturn(true);
        when(connection.getPublisherConnectionFactory()).thenReturn(publisherConnection);
        when(publisherConnection.isPublisherConfirms()).thenReturn(true);
        when(publisherConnection.isPublisherReturns()).thenReturn(true);
        publisher = new OutboxPublisher(outbox, rabbit, transactions, 5);

        var event = mock(EventOutbox.class);
        when(event.eventId()).thenReturn(eventId);
        when(event.actorId()).thenReturn(userId);
        when(event.aggregateId()).thenReturn(attemptId);
        when(outbox.findTop20ByPublishedFalseOrderByOccurredAtAsc()).thenAnswer(call -> {
            assertTrue(TransactionSynchronizationManager.isActualTransactionActive());
            assertTrue(TransactionSynchronizationManager.isCurrentTransactionReadOnly());
            return List.of(event);
        });
        when(outbox.markPublished(eventId)).thenAnswer(call -> {
            assertTrue(TransactionSynchronizationManager.isActualTransactionActive());
            assertFalse(TransactionSynchronizationManager.isCurrentTransactionReadOnly());
            transactions.updated = true;
            return 1;
        });
    }

    @Test
    void ackCommitsTheUpdateAfterTheReadTransactionHasEnded() {
        onSend((correlation, number) -> acknowledge(correlation));

        publisher.forward();

        assertTrue(transactions.published);
        assertEquals(List.of("read begin", "commit", "write begin", "commit"), transactions.steps);
        assertFalse(TransactionSynchronizationManager.isActualTransactionActive());
        assertEquals(List.of("{\"eventId\":\"%s\",\"userId\":\"%s\",\"attemptId\":\"%s\",\"type\":\"AttemptGraded\"}"
                .formatted(eventId, userId, attemptId)), payloads);
    }

    @Test
    void assessmentPropertiesConfigureTheActualRabbitTemplateAndPublisherConnection() {
        new ApplicationContextRunner()
                .withConfiguration(AutoConfigurations.of(RabbitAutoConfiguration.class))
                .withUserConfiguration(MessagingConfig.class)
                .withInitializer(context -> TestPropertySourceUtils.addPropertiesFilesToEnvironment(context,
                        "classpath:application.properties"))
                .run(context -> {
                    assertNull(context.getStartupFailure());
                    var template = context.getBean(RabbitTemplate.class);
                    var connection = template.getConnectionFactory();
                    var publisherFactory = connection.getPublisherConnectionFactory();
                    assertTrue(template.isUsePublisherConnection());
                    assertNotNull(publisherFactory);
                    assertNotSame(connection, publisherFactory);
                    assertTrue(publisherFactory.isPublisherConfirms());
                    assertTrue(publisherFactory.isPublisherReturns());
                    assertTrue(template.isMandatoryFor(new Message(new byte[0])));
                });
    }

    @Test
    void mandatoryReturnWinsOverAck() {
        onSend((correlation, number) -> {
            correlation.setReturned(new ReturnedMessage(new Message(new byte[0]), 312, "NO_ROUTE", EXCHANGE, ROUTING_KEY));
            acknowledge(correlation);
        });

        publisher.forward();

        verify(outbox, never()).markPublished(any());
    }

    @Test
    void nackLeavesTheEventPending() {
        onSend((correlation, number) -> correlation.getFuture().complete(new CorrelationData.Confirm(false, "nack")));

        publisher.forward();

        verify(outbox, never()).markPublished(any());
        verifyNoInteractionsWithReset();
    }

    @Test
    void timeoutRetiresTheConnectionBeforeRetryAndIgnoresLateAck() {
        onSend((correlation, number) -> {
            if (number == 2) {
                verify(publisherConnection).resetConnection();
                acknowledge(correlations.getFirst());
                correlation.getFuture().complete(new CorrelationData.Confirm(false, "nack"));
            } else if (number == 3) {
                acknowledge(correlation);
            }
        });

        publisher.forward();
        assertFalse(transactions.published);
        publisher.forward();
        verify(outbox, never()).markPublished(any());
        publisher.forward();

        assertTrue(transactions.published);
        assertStableEventAndUniqueCorrelations(3);
        verify(connection, never()).resetConnection();
    }

    @Test
    void lateAckBeforeNextPollRequiresAnotherSendButNoConnectionReset() {
        onSend((correlation, number) -> {
            if (number == 2) acknowledge(correlation);
        });

        publisher.forward();
        acknowledge(correlations.getFirst());
        verify(outbox, never()).markPublished(any());
        publisher.forward();

        assertTrue(transactions.published);
        verifyNoInteractionsWithReset();
        assertStableEventAndUniqueCorrelations(2);
    }

    @Test
    void resetFailurePreventsAnotherPendingPublishFromAccumulating() {
        onSend((correlation, number) -> {});
        publisher.forward();
        doThrow(new AmqpException("reset failed")).when(publisherConnection).resetConnection();

        publisher.forward();

        assertEquals(1, correlations.size());
        verify(outbox, never()).markPublished(any());
    }

    @Test
    void sendExceptionAndFailedConfirmLeaveTheEventPending() {
        onSend((correlation, number) -> {
            if (number == 1) throw new AmqpException("connection unavailable");
            correlation.getFuture().completeExceptionally(new AmqpException("connection closed"));
        });

        publisher.forward();
        publisher.forward();

        verify(outbox, never()).markPublished(any());
        assertStableEventAndUniqueCorrelations(2);
    }

    @Test
    void databaseUpdateFailureRollsBackAndRetriesTheSameEvent() {
        onSend((correlation, number) -> acknowledge(correlation));
        doThrow(new DataAccessResourceFailureException("write unavailable"))
                .doAnswer(call -> {
                    transactions.updated = true;
                    return 1;
                }).when(outbox).markPublished(eventId);

        publisher.forward();
        assertFalse(transactions.published);
        assertEquals("rollback", transactions.steps.getLast());
        publisher.forward();

        assertTrue(transactions.published);
        assertStableEventAndUniqueCorrelations(2);
    }

    @Test
    void commitFailureAfterAckAlsoRetriesTheSameEvent() {
        onSend((correlation, number) -> acknowledge(correlation));
        transactions.failNextWriteCommit = true;

        publisher.forward();
        assertFalse(transactions.published);
        assertEquals("commit failed", transactions.steps.getLast());
        publisher.forward();

        assertTrue(transactions.published);
        assertStableEventAndUniqueCorrelations(2);
    }

    private void onSend(BiConsumer<CorrelationData, Integer> behavior) {
        doAnswer(call -> {
            assertFalse(TransactionSynchronizationManager.isActualTransactionActive());
            CorrelationData correlation = call.getArgument(3);
            correlations.add(correlation);
            payloads.add(call.getArgument(2));
            behavior.accept(correlation, correlations.size());
            return null;
        }).when(rabbit).convertAndSend(eq(EXCHANGE), eq(ROUTING_KEY), anyString(), any(CorrelationData.class));
    }

    private static void acknowledge(CorrelationData correlation) {
        correlation.getFuture().complete(new CorrelationData.Confirm(true, null));
    }

    private void assertStableEventAndUniqueCorrelations(int sends) {
        assertEquals(sends, correlations.size());
        assertEquals(sends, correlations.stream().map(CorrelationData::getId).distinct().count());
        assertEquals(1, payloads.stream().distinct().count());
        assertTrue(payloads.getFirst().contains(eventId.toString()));
    }

    private void verifyNoInteractionsWithReset() {
        verify(publisherConnection, never()).resetConnection();
    }

    private static class RecordingTransactions extends AbstractPlatformTransactionManager {
        private final List<String> steps = new ArrayList<>();
        private boolean updated;
        private boolean published;
        private boolean failNextWriteCommit;

        @Override
        protected Object doGetTransaction() {
            return new Object();
        }

        @Override
        protected void doBegin(Object transaction, TransactionDefinition definition) {
            steps.add(definition.isReadOnly() ? "read begin" : "write begin");
        }

        @Override
        protected void doCommit(DefaultTransactionStatus status) {
            if (updated && failNextWriteCommit) {
                failNextWriteCommit = false;
                updated = false;
                steps.add("commit failed");
                throw new TransactionSystemException("commit unavailable");
            }
            published |= updated;
            updated = false;
            steps.add("commit");
        }

        @Override
        protected void doRollback(DefaultTransactionStatus status) {
            updated = false;
            steps.add("rollback");
        }
    }
}
