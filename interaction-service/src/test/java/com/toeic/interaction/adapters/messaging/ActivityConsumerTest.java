package com.toeic.interaction.adapters.messaging;

import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.*;

import com.toeic.interaction.data.persistence.ActivityRepo;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

class ActivityConsumerTest {
    @Test
    void concurrentDuplicateDeliveriesBothCompleteWithOneStoredActivity() throws Exception {
        var repo = mock(ActivityRepo.class);
        var consumer = new ActivityConsumer(repo, new ObjectMapper());
        UUID eventId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID attemptId = UUID.randomUUID();
        var inserts = new CyclicBarrier(2);
        var stored = new AtomicBoolean();
        when(repo.insertAttemptGradedIfAbsent(eventId, userId, attemptId)).thenAnswer(call -> {
            inserts.await(5, TimeUnit.SECONDS);
            return stored.compareAndSet(false, true) ? 1 : 0;
        });
        String payload = payload(eventId, userId, attemptId);
        Callable<Void> deliver = () -> {
            consumer.handle(payload);
            return null;
        };

        try (var workers = Executors.newFixedThreadPool(2)) {
            var deliveries = workers.invokeAll(List.of(deliver, deliver), 10, TimeUnit.SECONDS);
            for (var delivery : deliveries) assertNull(delivery.get());
        }

        assertTrue(stored.get());
        verify(repo, times(2)).insertAttemptGradedIfAbsent(eventId, userId, attemptId);
        verifyNoMoreInteractions(repo);
    }

    @Test
    void repeatedDeliveryOfTheSameEventOnlyInsertsOneActivity() throws Exception {
        var repo = mock(ActivityRepo.class);
        var consumer = new ActivityConsumer(repo, new ObjectMapper());
        UUID eventId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID attemptId = UUID.randomUUID();
        when(repo.insertAttemptGradedIfAbsent(eventId, userId, attemptId)).thenReturn(1, 0);
        String payload = payload(eventId, userId, attemptId);

        consumer.handle(payload);
        consumer.handle(payload);

        verify(repo, times(2)).insertAttemptGradedIfAbsent(eventId, userId, attemptId);
        verifyNoMoreInteractions(repo);
    }

    private static String payload(UUID eventId, UUID userId, UUID attemptId) {
        return "{\"eventId\":\"%s\",\"userId\":\"%s\",\"attemptId\":\"%s\",\"type\":\"AttemptGraded\"}"
                .formatted(eventId, userId, attemptId);
    }
}
