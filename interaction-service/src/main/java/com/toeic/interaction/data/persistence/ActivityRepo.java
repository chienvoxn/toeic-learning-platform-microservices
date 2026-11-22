package com.toeic.interaction.data.persistence;
import com.toeic.interaction.core.LearningActivity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ActivityRepo extends JpaRepository<LearningActivity, UUID> {
    List<LearningActivity> findByUserIdOrderByRecordedAtDesc(UUID userId);

    @Modifying
    @Query(value = """
            INSERT INTO learning_activities (event_id, user_id, attempt_id, kind, recorded_at)
            VALUES (:eventId, :userId, :attemptId, 'ATTEMPT_GRADED', CURRENT_TIMESTAMP)
            ON CONFLICT (event_id) DO NOTHING
            """, nativeQuery = true)
    int insertAttemptGradedIfAbsent(@Param("eventId") UUID eventId, @Param("userId") UUID userId,
                                    @Param("attemptId") UUID attemptId);
}
