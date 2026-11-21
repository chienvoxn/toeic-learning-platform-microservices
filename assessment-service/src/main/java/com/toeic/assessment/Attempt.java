package com.toeic.assessment;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(name = "attempts")
class Attempt {
    @Id
    UUID attemptId;

    @Column(nullable = false)
    UUID userId;

    @Column(nullable = false)
    UUID quizId;

    @Column(nullable = false)
    String status = "IN_PROGRESS";

    @Column(nullable = false)
    OffsetDateTime createdAt;

    Integer correctCount;
    OffsetDateTime gradedAt;

    protected Attempt() {
    }

    Attempt(UUID quizId, UUID userId) {
        this.attemptId = UUID.randomUUID();
        this.quizId = quizId;
        this.userId = userId;
        this.createdAt = OffsetDateTime.now(ZoneOffset.UTC);
    }
}
