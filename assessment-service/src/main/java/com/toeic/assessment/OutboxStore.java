package com.toeic.assessment;

/** Application-facing persistence port for transactional outbox writes. */
interface OutboxStore {
    EventOutbox save(EventOutbox event);
}
