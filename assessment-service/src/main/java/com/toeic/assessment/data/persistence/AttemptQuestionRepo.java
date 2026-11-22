package com.toeic.assessment.data.persistence;

import com.toeic.assessment.core.AttemptQuestion;
import com.toeic.assessment.core.AttemptQuestionKey;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface AttemptQuestionRepo extends JpaRepository<AttemptQuestion, AttemptQuestionKey> {
    List<AttemptQuestion> findByAttemptId(UUID attemptId);
}
