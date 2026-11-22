package com.toeic.assessment;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Application-facing persistence port for AttemptQuestion. */
interface AttemptQuestionStore {
    AttemptQuestion save(AttemptQuestion question);
    Optional<AttemptQuestion> findById(AttemptQuestionKey key);
    List<AttemptQuestion> findByAttemptId(UUID attemptId);
}
