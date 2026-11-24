package com.toeic.content.data.persistence;
import com.toeic.content.core.Quiz;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface QuizRepo extends JpaRepository<Quiz, UUID> {
    List<Quiz> findByPublishedTrueOrderByPartAsc();
    List<Quiz> findByOwnerUserIdOrderByTitleAscQuizIdAsc(UUID owner);
    Optional<Quiz> findByQuizIdAndOwnerUserId(UUID id, UUID owner);

    @Query("select q from Quiz q where "
        + "(:term = '' or lower(q.title) like lower(concat('%', :term, '%'))) "
        + "and (:part = 0 or q.part = :part) "
        + "and (:state = 'ALL' or (:state = 'PUBLISHED' and q.published = true) "
        + "or (:state = 'DRAFT' and q.published = false))")
    Page<Quiz> searchAdmin(@Param("term") String term, @Param("state") String state,
                          @Param("part") int part, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select q from Quiz q where q.quizId = :id")
    Optional<Quiz> lockAdmin(@Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Quiz> findForWriteByQuizIdAndOwnerUserId(UUID id, UUID owner);
}
