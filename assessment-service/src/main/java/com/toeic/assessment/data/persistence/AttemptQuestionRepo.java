package com.toeic.assessment.data.persistence;

import com.toeic.assessment.core.AttemptQuestion;
import com.toeic.assessment.core.AttemptQuestionKey;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

interface AttemptQuestionRepo extends JpaRepository<AttemptQuestion, AttemptQuestionKey> {
    @Query("""
            select q from AttemptQuestion q
            where q.attemptId = :attemptId
            order by q.position asc nulls last, q.questionId asc
            """)
    List<AttemptQuestion> findByAttemptId(UUID attemptId);
}
