package com.toeic.content.data.persistence;
import com.toeic.content.core.QuizQuestion;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface QuizQuestionRepo extends JpaRepository<QuizQuestion, UUID> {
    @Query("select q from QuizQuestion q where q.quizId = :quizId order by q.position asc nulls last, q.questionId")
    List<QuizQuestion> findInQuizOrder(UUID quizId);

    long countByQuizId(UUID quizId);

    @Modifying
    @Query("delete from QuizQuestion q where q.quizId = :quizId")
    void deleteAllForQuiz(UUID quizId);
}
