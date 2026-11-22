package com.toeic.assessment;

import org.springframework.stereotype.Repository;

/** Persistence adapter: writes to the existing transactional outbox table. */
@Repository
class JpaOutboxStore implements OutboxStore {
    private final OutboxRepo repository;

    JpaOutboxStore(OutboxRepo repository) {
        this.repository = repository;
    }

    @Override
    public EventOutbox save(EventOutbox event) {
        return repository.save(event);
    }
}
