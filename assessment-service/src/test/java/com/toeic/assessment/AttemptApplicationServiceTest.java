package com.toeic.assessment;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Application-level behavior tests: no Spring context, database or broker required. */
class AttemptApplicationServiceTest {
    private static final String BEARER = "Bearer test-token";

    private AttemptStore attempts;
    private AttemptQuestionStore questions;
    private OutboxStore outbox;
    private IdentityClient identity;
    private QuizClient quizzes;
    private DailyAttemptQuota dailyQuota;
    private AttemptApplicationService service;

    private final UUID userId = UUID.randomUUID();
    private final UUID quizId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        attempts = mock(AttemptStore.class);
        questions = mock(AttemptQuestionStore.class);
        outbox = mock(OutboxStore.class);
        identity = mock(IdentityClient.class);
        quizzes = mock(QuizClient.class);
        dailyQuota = mock(DailyAttemptQuota.class);
        service = new AttemptApplicationService(
                attempts, questions, outbox, identity, quizzes, dailyQuota);
    }

    private QuizClient.QuizQuestion snapshotQuestion() {
        return new QuizClient.QuizQuestion(
                UUID.randomUUID(), "Question?",
                Map.of("A", "First", "B", "Second", "C", "Third", "D", "Fourth"),
                "A", "Explanation");
    }

    private void stubAllowedUser() {
        when(identity.actor(BEARER)).thenReturn(
                new TokenService.Actor(userId, Set.of("LEARNER"), Set.of("assessment:submit")));
    }

    private static void assertStatus(HttpStatus expected, ResponseStatusException exception) {
        assertEquals(expected.value(), exception.getStatusCode().value());
    }

    @Test
    void deniesStartingWhenActorLacksPermission() {
        when(identity.actor(BEARER)).thenReturn(
                new TokenService.Actor(userId, Set.of("LEARNER"), Set.of()));

        var exception = assertThrows(ResponseStatusException.class,
                () -> service.start(BEARER, quizId));

        assertStatus(HttpStatus.FORBIDDEN, exception);
        verifyNoInteractions(quizzes, dailyQuota, attempts, questions, outbox);
    }

    @Test
    void deniesPremiumQuizForFreeAccountBeforeQuotaOrWrites() {
        stubAllowedUser();
        when(quizzes.snapshot(quizId)).thenReturn(
                new QuizClient.Snapshot(quizId, true, List.of(snapshotQuestion())));
        when(quizzes.entitlement(userId)).thenReturn(new QuizClient.Entitlement("FREE", 10));

        var exception = assertThrows(ResponseStatusException.class,
                () -> service.start(BEARER, quizId));

        assertStatus(HttpStatus.FORBIDDEN, exception);
        verifyNoInteractions(dailyQuota, attempts, questions, outbox);
    }

    @Test
    void reservesQuotaBeforeSavingAttemptAndItsQuestions() {
        stubAllowedUser();
        when(quizzes.snapshot(quizId)).thenReturn(
                new QuizClient.Snapshot(quizId, false, List.of(snapshotQuestion())));
        when(quizzes.entitlement(userId)).thenReturn(new QuizClient.Entitlement("FREE", 10));
        when(attempts.save(any(Attempt.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(questions.save(any(AttemptQuestion.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(questions.findByAttemptId(any(UUID.class))).thenReturn(List.of());

        AttemptView result = service.start(BEARER, quizId);

        assertEquals(quizId, result.quizId());
        assertEquals("IN_PROGRESS", result.status());
        var order = inOrder(dailyQuota, attempts, questions);
        order.verify(dailyQuota).reserve(userId, 10);
        order.verify(attempts).save(any(Attempt.class));
        order.verify(questions).save(any(AttemptQuestion.class));
        verifyNoInteractions(outbox);
    }

    @Test
    void cannotAnswerAfterGradingAndDoesNotWriteQuestion() {
        Attempt attempt = new Attempt(quizId, userId);
        assertTrue(attempt.grade(List.of()));
        when(identity.requireUser(BEARER)).thenReturn(userId);
        when(attempts.lockOwn(attempt.attemptId, userId)).thenReturn(Optional.of(attempt));

        var exception = assertThrows(ResponseStatusException.class,
                () -> service.answer(BEARER, attempt.attemptId, UUID.randomUUID(), "A"));

        assertStatus(HttpStatus.CONFLICT, exception);
        verifyNoInteractions(questions, outbox);
        verify(attempts, never()).save(any());
    }

    @Test
    void repeatedSubmitReturnsStoredResultWithoutExtraEvent() {
        Attempt attempt = new Attempt(quizId, userId);
        assertTrue(attempt.grade(List.of()));
        when(identity.requireUser(BEARER)).thenReturn(userId);
        when(attempts.lockOwn(attempt.attemptId, userId)).thenReturn(Optional.of(attempt));
        when(questions.findByAttemptId(attempt.attemptId)).thenReturn(List.of());

        AttemptView result = service.submit(BEARER, attempt.attemptId);

        assertEquals("GRADED", result.status());
        assertEquals(0, result.correct());
        verify(attempts, never()).save(any());
        verifyNoInteractions(outbox);
    }

    @Test
    void doesNotExposeAttemptOwnedByAnotherUser() {
        UUID otherUserId = UUID.randomUUID();
        Attempt foreign = new Attempt(quizId, otherUserId);
        when(identity.requireUser(BEARER)).thenReturn(userId);
        when(attempts.findById(foreign.attemptId)).thenReturn(Optional.of(foreign));

        var exception = assertThrows(ResponseStatusException.class,
                () -> service.get(BEARER, foreign.attemptId));

        assertStatus(HttpStatus.NOT_FOUND, exception);
        verifyNoInteractions(questions, outbox);
    }

    @Test
    void firstSubmitPersistsGradeAndExactlyOneOutboxEvent() {
        Attempt attempt = new Attempt(quizId, userId);
        AttemptQuestion question = new AttemptQuestion(
                attempt.attemptId, UUID.randomUUID(), "Question?", "A", "B", "C", "D", "A", "Why");
        attempt.answer(question, "A");
        when(identity.requireUser(BEARER)).thenReturn(userId);
        when(attempts.lockOwn(attempt.attemptId, userId)).thenReturn(Optional.of(attempt));
        when(questions.findByAttemptId(attempt.attemptId)).thenReturn(List.of(question));

        AttemptView result = service.submit(BEARER, attempt.attemptId);

        assertEquals("GRADED", result.status());
        assertEquals(1, result.correct());
        verify(attempts, times(1)).save(same(attempt));
        verify(outbox, times(1)).save(argThat(event ->
                event.aggregateId.equals(attempt.attemptId) &&
                event.actorId.equals(userId) &&
                "AttemptGraded".equals(event.eventType)));
    }
}
