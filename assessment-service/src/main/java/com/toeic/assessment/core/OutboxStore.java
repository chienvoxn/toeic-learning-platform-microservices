package com.toeic.assessment.core;

/** Application-facing persistence port for transactional outbox writes. */
public interface OutboxStore {
    EventOutbox save(EventOutbox event);
}
