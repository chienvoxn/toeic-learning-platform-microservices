package com.toeic.assessment.core;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(name = "event_outbox")
public class EventOutbox {
    @Id
    UUID eventId;

    @Column(nullable = false)
    UUID aggregateId;

    @Column(nullable = false)
    UUID actorId;

    @Column(nullable = false)
    String eventType;

    @Column(nullable = false)
    boolean published = false;

    @Column(nullable = false)
    OffsetDateTime occurredAt;

    protected EventOutbox() {
    }

    EventOutbox(Attempt attempt) {
        this.eventId = UUID.randomUUID();
        this.aggregateId = attempt.attemptId;
        this.actorId = attempt.userId;
        this.eventType = "AttemptGraded";
        this.occurredAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    public UUID eventId() {
        return eventId;
    }

    public UUID aggregateId() {
        return aggregateId;
    }

    public UUID actorId() {
        return actorId;
    }

    public void markPublished() {
        published = true;
    }
}
