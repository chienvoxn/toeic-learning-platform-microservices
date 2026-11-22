package com.toeic.assessment;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Application-facing persistence port for Attempt. */
interface AttemptStore {
    Attempt save(Attempt attempt);
    Optional<Attempt> findById(UUID attemptId);
    Optional<Attempt> lockOwn(UUID attemptId, UUID userId);
    List<Attempt> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
