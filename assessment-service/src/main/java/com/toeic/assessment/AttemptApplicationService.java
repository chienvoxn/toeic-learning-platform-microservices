package com.toeic.assessment;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
class AttemptApplicationService {
    private final AttemptRepo attempts;
    private final AttemptQuestionRepo questions;
    private final OutboxRepo outbox;
    private final IdentityClient identity;
    private final QuizClient quizzes;
    private final DailyAttemptQuota dailyQuota;

    AttemptApplicationService(
            AttemptRepo attempts,
            AttemptQuestionRepo questions,
            OutboxRepo outbox,
            IdentityClient identity,
            QuizClient quizzes,
            DailyAttemptQuota dailyQuota
    ) {
        this.attempts = attempts;
        this.questions = questions;
        this.outbox = outbox;
        this.identity = identity;
        this.quizzes = quizzes;
        this.dailyQuota = dailyQuota;
    }

    private List<AttemptView.Question> projection(UUID attemptId, boolean graded) {
        return questions.findByAttemptId(attemptId).stream()
                .map(q -> new AttemptView.Question(
                        q.questionId,
                        q.prompt,
                        Map.of(
                                "A", q.optionA,
                                "B", q.optionB,
                                "C", q.optionC,
                                "D", q.optionD
                        ),
                        q.selectedChoice,
                        graded ? q.correctChoice.equals(q.selectedChoice) : null,
                        graded ? q.explanation : null
                ))
                .toList();
    }

    private AttemptView view(Attempt attempt) {
        var attemptQuestions = projection(
                attempt.attemptId,
                "GRADED".equals(attempt.status)
        );
        return new AttemptView(
                attempt.attemptId,
                attempt.quizId,
                attempt.status,
                attemptQuestions.size(),
                attempt.correctCount,
                attempt.createdAt,
                attemptQuestions
        );
    }

    private Attempt own(UUID userId, UUID attemptId) {
        return attempts.findById(attemptId)
                .filter(attempt -> attempt.userId.equals(userId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @Transactional
    public AttemptView start(String bearer, UUID quizId) {
        var actor = identity.actor(bearer);
        if (!actor.can("assessment:submit")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }

        UUID userId = actor.userId();
        var snapshot = quizzes.snapshot(quizId);
        var entitlement = quizzes.entitlement(userId);

        if (snapshot.premium() && !"PRO".equals(entitlement.plan())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Premium membership required"
            );
        }

        // This and the attempt writes must execute in one transaction.
        dailyQuota.reserve(userId, entitlement.dailyLimit());

        var attempt = attempts.save(new Attempt(quizId, userId));
        for (var question : snapshot.questions()) {
            questions.save(new AttemptQuestion(
                    attempt.attemptId,
                    question.id(),
                    question.prompt(),
                    question.options().get("A"),
                    question.options().get("B"),
                    question.options().get("C"),
                    question.options().get("D"),
                    question.correctChoice(),
                    question.explanation()
            ));
        }

        return view(attempt);
    }

    @Transactional(readOnly = true)
    public List<AttemptView> mine(String bearer) {
        return attempts.findByUserIdOrderByCreatedAtDesc(identity.requireUser(bearer))
                .stream()
                .map(this::view)
                .toList();
    }

    @Transactional(readOnly = true)
    public AttemptView get(String bearer, UUID attemptId) {
        return view(own(identity.requireUser(bearer), attemptId));
    }

    @Transactional
    public AttemptView answer(String bearer, UUID attemptId, UUID questionId, String choice) {
        UUID userId = identity.requireUser(bearer);
        Attempt attempt = attempts.lockOwn(attemptId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (!"IN_PROGRESS".equals(attempt.status)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Already graded");
        }

        var key = new AttemptQuestionKey();
        key.attemptId = attemptId;
        key.questionId = questionId;

        var question = questions.findById(key)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        question.selectedChoice = choice;
        questions.save(question);
        return view(attempt);
    }

    @Transactional
    public AttemptView submit(String bearer, UUID attemptId) {
        UUID userId = identity.requireUser(bearer);
        Attempt attempt = attempts.lockOwn(attemptId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (!"GRADED".equals(attempt.status)) {
            attempt.correctCount = (int) questions.findByAttemptId(attemptId).stream()
                    .filter(q -> q.correctChoice.equals(q.selectedChoice))
                    .count();
            attempt.status = "GRADED";
            attempt.gradedAt = OffsetDateTime.now(ZoneOffset.UTC);
            attempts.save(attempt);
            outbox.save(new EventOutbox(attempt));
        }

        return view(attempt);
    }
}
