package com.toeic.assessment.adapters.messaging;

import com.toeic.assessment.core.EventOutbox;
import com.toeic.assessment.data.persistence.OutboxRepo;
import java.util.UUID;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.Assert;

@Component
public class OutboxPublisher {
    private static final Logger log = LoggerFactory.getLogger(OutboxPublisher.class);
    private final OutboxRepo outbox;
    private final RabbitTemplate rabbit;
    private final ConnectionFactory publisherConnection;
    private final TransactionTemplate readTransaction;
    private final TransactionTemplate writeTransaction;
    private final long confirmTimeoutMs;

    // Only the fixed-delay worker owns this reference. A late confirm cannot update the database.
    private CorrelationData outstanding;

    OutboxPublisher(OutboxRepo outbox, RabbitTemplate rabbit, PlatformTransactionManager transactions,
                    @Value("${toeic.outbox.confirm-timeout-ms:5000}") long confirmTimeoutMs) {
        Assert.isTrue(confirmTimeoutMs > 0, "Outbox confirm timeout must be positive");
        this.outbox = outbox;
        this.rabbit = rabbit;
        this.publisherConnection = rabbit.getConnectionFactory().getPublisherConnectionFactory();
        Assert.state(rabbit.isUsePublisherConnection() && publisherConnection != null
                && publisherConnection != rabbit.getConnectionFactory(), "Outbox requires a separate publisher connection");
        Assert.state(publisherConnection.isPublisherConfirms() && publisherConnection.isPublisherReturns(),
                "Outbox requires correlated confirms and publisher returns");
        Assert.state(Boolean.TRUE.equals(rabbit.isMandatoryFor(new Message(new byte[0]))),
                "Outbox requires mandatory publishing");
        this.readTransaction = new TransactionTemplate(transactions);
        this.readTransaction.setReadOnly(true);
        this.writeTransaction = new TransactionTemplate(transactions);
        this.confirmTimeoutMs = confirmTimeoutMs;
    }

    @Scheduled(fixedDelay = 3000)
    public void forward() {
        if (outstanding != null) {
            try {
                if (!outstanding.getFuture().isDone()) {
                    publisherConnection.resetConnection();
                }
                outstanding = null;
            } catch (RuntimeException ex) {
                log.warn("Outbox publisher connection reset failed; retry next poll: {}", ex.getClass().getSimpleName());
                return;
            }
        }

        for (var event : readTransaction.execute(status -> outbox.findTop20ByPublishedFalseOrderByOccurredAtAsc())) {
            if (!publish(event)) return;
            try {
                writeTransaction.executeWithoutResult(status -> outbox.markPublished(event.eventId()));
            } catch (RuntimeException ex) {
                log.warn("Outbox mark published failed for event {}; retry next poll: {}",
                        event.eventId(), ex.getClass().getSimpleName());
                return;
            }
        }
    }

    private boolean publish(EventOutbox event) {
        var correlation = new CorrelationData(UUID.randomUUID().toString());
        outstanding = correlation;
        try {
            String payload = "{\"eventId\":\"%s\",\"userId\":\"%s\",\"attemptId\":\"%s\",\"type\":\"AttemptGraded\"}"
                    .formatted(event.eventId(), event.actorId(), event.aggregateId());
            rabbit.convertAndSend("toeic.events", "attempt.graded", payload, correlation);
            var confirm = correlation.getFuture().get(confirmTimeoutMs, TimeUnit.MILLISECONDS);
            var returned = correlation.getReturned();
            if (returned != null) {
                log.warn("Outbox event {} returned by broker (reply code {}); retry next poll",
                        event.eventId(), returned.getReplyCode());
            } else if (confirm.ack()) {
                return true;
            } else {
                log.warn("Outbox event {} was negatively confirmed; retry next poll", event.eventId());
            }
        } catch (TimeoutException ex) {
            log.warn("Outbox confirm timed out for event {}; retry next poll", event.eventId());
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            log.warn("Outbox confirm wait interrupted for event {}", event.eventId());
        } catch (ExecutionException | RuntimeException ex) {
            log.warn("Outbox publish failed for event {}; retry next poll: {}",
                    event.eventId(), ex.getClass().getSimpleName());
        } finally {
            if (correlation.getFuture().isDone()) outstanding = null;
        }
        return false;
    }
}
