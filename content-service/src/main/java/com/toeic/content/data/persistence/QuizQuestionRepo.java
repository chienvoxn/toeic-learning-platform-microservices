package com.toeic.content.data.persistence;
import com.toeic.content.core.QuizQuestion;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
public interface QuizQuestionRepo extends JpaRepository<QuizQuestion,UUID>{List<QuizQuestion> findByQuizIdOrderByQuestionIdAsc(UUID quizId);}
