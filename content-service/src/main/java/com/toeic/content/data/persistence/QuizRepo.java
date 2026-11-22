package com.toeic.content.data.persistence;
import com.toeic.content.core.Quiz;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
public interface QuizRepo extends JpaRepository<Quiz,UUID>{List<Quiz> findByPublishedTrueOrderByPartAsc();}
