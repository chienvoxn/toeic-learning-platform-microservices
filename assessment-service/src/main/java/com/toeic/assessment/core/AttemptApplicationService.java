package com.toeic.assessment.core;

import com.toeic.assessment.adapters.http.QuizClient;
import com.toeic.assessment.adapters.security.IdentityClient;
import com.toeic.assessment.data.jdbc.DailyAttemptQuota;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AttemptApplicationService {
    private final AttemptStore attempts;
    private final AttemptQuestionStore questions;
    private final OutboxStore outbox;
    private final IdentityClient identity;
    private final QuizClient quizzes;
    private final DailyAttemptQuota dailyQuota;

    AttemptApplicationService(
            AttemptStore attempts,
            AttemptQuestionStore questions,
            OutboxStore outbox,
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
                .map(q -> {
                    Map<String, String> choices = new java.util.LinkedHashMap<>();
                    if (q.optionA != null) choices.put("A", q.optionA);
                    if (q.optionB != null) choices.put("B", q.optionB);
                    if (q.optionC != null) choices.put("C", q.optionC);
                    if (q.optionD != null && !q.optionD.isBlank()) choices.put("D", q.optionD);
                    return new AttemptView.Question(
                            q.questionId,
                            q.position,
                            q.prompt,
                            choices,
                            q.selectedChoice,
                            graded ? q.correctChoice.equals(q.selectedChoice) : null,
                            graded ? q.explanation : null,
                            q.passageText,
                            q.audioUrl,
                            q.imageUrl,
                            q.groupId
                    );
                })
                .toList();
    }

    private AttemptView view(Attempt attempt) {
        var attemptQuestions = projection(
                attempt.attemptId,
                attempt.isGraded()
        );
        return new AttemptView(
                attempt.attemptId,
                attempt.quizId,
                attempt.status.name(),
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
        // Both Content versions define order by the snapshot array.
        int position = 1;
        for (var question : snapshot.questions()) {
            questions.save(new AttemptQuestion(
                    attempt.attemptId,
                    question.id(),
                    position++,
                    question.prompt(),
                    question.options().get("A"),
                    question.options().get("B"),
                    question.options().get("C"),
                    question.options().get("D"),
                    question.correctChoice(),
                    question.explanation(),
                    question.passageText(),
                    question.audioUrl(),
                    question.imageUrl(),
                    question.groupId()
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

        if (attempt.isGraded()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Already graded");
        }

        var key = new AttemptQuestionKey();
        key.attemptId = attemptId;
        key.questionId = questionId;

        var question = questions.findById(key)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        try {
            attempt.answer(question, choice);
        } catch (IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Already graded", ex);
        }
        questions.save(question);
        return view(attempt);
    }

    @Transactional
    public AttemptView submit(String bearer, UUID attemptId) {
        UUID userId = identity.requireUser(bearer);
        Attempt attempt = attempts.lockOwn(attemptId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (attempt.grade(questions.findByAttemptId(attemptId))) {
            attempts.save(attempt);
            outbox.save(new EventOutbox(attempt));
        }

        return view(attempt);
    }
}
