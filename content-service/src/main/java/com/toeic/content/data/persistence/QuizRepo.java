package com.toeic.content.data.persistence;
import com.toeic.content.core.Quiz;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import java.util.Optional;

public interface QuizRepo extends JpaRepository<Quiz, UUID> {
    List<Quiz> findByPublishedTrueOrderByPartAsc();
    List<Quiz> findByOwnerUserIdOrderByTitleAscQuizIdAsc(UUID owner);
    Optional<Quiz> findByQuizIdAndOwnerUserId(UUID id, UUID owner);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Quiz> findForWriteByQuizIdAndOwnerUserId(UUID id, UUID owner);
}
