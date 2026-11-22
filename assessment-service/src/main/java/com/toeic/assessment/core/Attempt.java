package com.toeic.assessment.core;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/** Aggregate root protecting the state transitions of a practice attempt. */
@Entity
@Table(name = "attempts")
public class Attempt {
    @Id
    UUID attemptId;

    @Column(nullable = false)
    UUID userId;

    @Column(nullable = false)
    UUID quizId;

    // Existing VARCHAR column remains unchanged; JPA persists the enum name.
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    AttemptStatus status = AttemptStatus.IN_PROGRESS;

    @Column(nullable = false)
    OffsetDateTime createdAt;

    Integer correctCount;
    OffsetDateTime gradedAt;

    protected Attempt() {
    }

    Attempt(UUID quizId, UUID userId) {
        this.attemptId = UUID.randomUUID();
        this.quizId = Objects.requireNonNull(quizId, "quizId");
        this.userId = Objects.requireNonNull(userId, "userId");
        this.createdAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    boolean isGraded() {
        return status == AttemptStatus.GRADED;
    }

    /** Assign an answer only while the aggregate is in progress. */
    void answer(AttemptQuestion question, String choice) {
        requireInProgress();
        Objects.requireNonNull(question, "question");
        if (!attemptId.equals(question.attemptId)) {
            throw new IllegalArgumentException("Question does not belong to this attempt");
        }
        question.selectChoice(choice);
    }

    /**
     * Complete grading exactly once. Returns false when the attempt was already graded,
     * so the application service can avoid creating a duplicate outbox event.
     */
    boolean grade(List<AttemptQuestion> questions) {
        if (isGraded()) {
            return false;
        }
        requireInProgress();
        Objects.requireNonNull(questions, "questions");
        for (AttemptQuestion question : questions) {
            if (question == null || !attemptId.equals(question.attemptId)) {
                throw new IllegalArgumentException("Question does not belong to this attempt");
            }
        }
        correctCount = Math.toIntExact(questions.stream().filter(AttemptQuestion::isCorrect).count());
        status = AttemptStatus.GRADED;
        gradedAt = OffsetDateTime.now(ZoneOffset.UTC);
        return true;
    }

    private void requireInProgress() {
        if (status != AttemptStatus.IN_PROGRESS) {
            throw new IllegalStateException("Already graded");
        }
    }
}
