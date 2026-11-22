package com.toeic.assessment.data.persistence;

import com.toeic.assessment.core.AttemptQuestion;
import com.toeic.assessment.core.AttemptQuestionKey;
import com.toeic.assessment.core.AttemptQuestionStore;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;

/** Persistence adapter: translates AttemptQuestionStore operations to Spring Data JPA. */
@Repository
class JpaAttemptQuestionStore implements AttemptQuestionStore {
    private final AttemptQuestionRepo repository;

    JpaAttemptQuestionStore(AttemptQuestionRepo repository) {
        this.repository = repository;
    }

    @Override
    public AttemptQuestion save(AttemptQuestion question) {
        return repository.save(question);
    }

    @Override
    public Optional<AttemptQuestion> findById(AttemptQuestionKey key) {
        return repository.findById(key);
    }

    @Override
    public List<AttemptQuestion> findByAttemptId(UUID attemptId) {
        return repository.findByAttemptId(attemptId);
    }
}
