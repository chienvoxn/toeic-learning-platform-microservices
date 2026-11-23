package com.toeic.assessment.core;

import com.toeic.assessment.adapters.http.QuizClient;
import com.toeic.assessment.adapters.security.IdentityClient;
import com.toeic.assessment.adapters.security.TokenService;
import com.toeic.assessment.data.jdbc.DailyAttemptQuota;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
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
    void persistsSnapshotArrayOrderAndKeepsItThroughReadsAnswerAndGrade() {
        stubAllowedUser();
        when(identity.requireUser(BEARER)).thenReturn(userId);
        var first = new QuizClient.QuizQuestion(UUID.fromString("ffffffff-ffff-ffff-ffff-ffffffffffff"),
                "First in snapshot", Map.of("A", "One", "B", "Two", "C", "Three", "D", "Four"), "B", "Why B");
        var second = new QuizClient.QuizQuestion(UUID.fromString("00000000-0000-0000-0000-000000000001"),
                "Second in snapshot", first.options(), "A", "Why A");
        when(quizzes.snapshot(quizId)).thenReturn(new QuizClient.Snapshot(quizId, false, List.of(first, second)));
        when(quizzes.entitlement(userId)).thenReturn(new QuizClient.Entitlement("FREE", 10));
        when(attempts.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        var persisted = new ArrayList<AttemptQuestion>();
        when(questions.save(any())).thenAnswer(invocation -> {
            AttemptQuestion question = invocation.getArgument(0);
            if (!persisted.contains(question)) persisted.add(question);
            return question;
        });
        when(questions.findByAttemptId(any())).thenAnswer(invocation -> List.copyOf(persisted));

        AttemptView opened = service.start(BEARER, quizId);
        assertEquals(List.of(1, 2), persisted.stream().map(question -> question.position).toList());
        assertEquals(List.of(first.id(), second.id()), persisted.stream().map(question -> question.questionId).toList());
        assertEquals(first.correctChoice(), persisted.getFirst().correctChoice);
        assertEquals(first.explanation(), persisted.getFirst().explanation);
        assertOrder(opened, List.of(first.id(), second.id()), List.of(1, 2));
        assertNull(opened.questions().getFirst().explanation());

        var savedAttempt = ArgumentCaptor.forClass(Attempt.class);
        verify(attempts).save(savedAttempt.capture());
        Attempt attempt = savedAttempt.getValue();
        UUID id = opened.id();
        when(attempts.findById(id)).thenReturn(Optional.of(attempt));
        when(attempts.lockOwn(id, userId)).thenReturn(Optional.of(attempt));
        var key = new AttemptQuestionKey();
        key.attemptId = id;
        key.questionId = first.id();
        when(questions.findById(key)).thenReturn(Optional.of(persisted.getFirst()));

        assertEquals(opened, service.get(BEARER, id));
        assertEquals(opened, service.get(BEARER, id));
        var answered = service.answer(BEARER, id, first.id(), "B");
        assertOrder(answered, List.of(first.id(), second.id()), List.of(1, 2));
        assertEquals("B", answered.questions().getFirst().selectedChoice());
        assertNull(answered.questions().getFirst().correct());
        var graded = service.submit(BEARER, id);
        assertOrder(graded, List.of(first.id(), second.id()), List.of(1, 2));
        assertEquals("GRADED", graded.status());
        assertEquals(1, graded.correct());
        assertEquals("Why B", graded.questions().getFirst().explanation());
        assertEquals(graded, service.get(BEARER, id));
        assertEquals(graded, service.submit(BEARER, id));
        verify(dailyQuota, times(1)).reserve(userId, 10);
        verify(outbox, times(1)).save(any());
    }

    @Test
    void legacyQuestionWithoutPositionKeepsIdentityAndExposesNullPosition() {
        Attempt attempt = new Attempt(quizId, userId);
        UUID id = UUID.randomUUID();
        var legacy = new AttemptQuestion(attempt.attemptId, id, null, "Legacy", "A", "B", "C", "D", "A", "Why");
        legacy.selectChoice("B");
        when(identity.requireUser(BEARER)).thenReturn(userId);
        when(attempts.findById(attempt.attemptId)).thenReturn(Optional.of(attempt));
        when(questions.findByAttemptId(attempt.attemptId)).thenReturn(List.of(legacy));

        var result = service.get(BEARER, attempt.attemptId).questions().getFirst();
        assertEquals(id, result.id());
        assertEquals("B", result.selectedChoice());
        assertNull(result.position());
        verify(questions, never()).save(any());
    }

    private static void assertOrder(AttemptView view, List<UUID> ids, List<Integer> positions) {
        assertEquals(ids, view.questions().stream().map(AttemptView.Question::id).toList());
        assertEquals(positions, view.questions().stream().map(AttemptView.Question::position).toList());
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
                attempt.attemptId, UUID.randomUUID(), null, "Question?", "A", "B", "C", "D", "A", "Why");
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
