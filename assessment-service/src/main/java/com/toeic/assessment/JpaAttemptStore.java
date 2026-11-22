package com.toeic.assessment;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;

/** Persistence adapter: translates AttemptStore operations to Spring Data JPA. */
@Repository
class JpaAttemptStore implements AttemptStore {
    private final AttemptRepo repository;

    JpaAttemptStore(AttemptRepo repository) {
        this.repository = repository;
    }

    @Override
    public Attempt save(Attempt attempt) {
        return repository.save(attempt);
    }

    @Override
    public Optional<Attempt> findById(UUID attemptId) {
        return repository.findById(attemptId);
    }

    @Override
    public Optional<Attempt> lockOwn(UUID attemptId, UUID userId) {
        return repository.lockOwn(attemptId, userId);
    }

    @Override
    public List<Attempt> findByUserIdOrderByCreatedAtDesc(UUID userId) {
        return repository.findByUserIdOrderByCreatedAtDesc(userId);
    }
}
