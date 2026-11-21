package com.toeic.assessment;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface AttemptQuestionRepo extends JpaRepository<AttemptQuestion, AttemptQuestionKey> {
    List<AttemptQuestion> findByAttemptId(UUID attemptId);
}
