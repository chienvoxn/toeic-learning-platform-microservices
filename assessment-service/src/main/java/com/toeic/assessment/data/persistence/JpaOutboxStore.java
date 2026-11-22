package com.toeic.assessment.data.persistence;

import com.toeic.assessment.core.EventOutbox;
import com.toeic.assessment.core.OutboxStore;

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
