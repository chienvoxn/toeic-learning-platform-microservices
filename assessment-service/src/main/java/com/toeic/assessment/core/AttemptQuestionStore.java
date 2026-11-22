package com.toeic.assessment.core;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Application-facing persistence port for AttemptQuestion. */
public interface AttemptQuestionStore {
    AttemptQuestion save(AttemptQuestion question);
    Optional<AttemptQuestion> findById(AttemptQuestionKey key);
    List<AttemptQuestion> findByAttemptId(UUID attemptId);
}
