package com.toeic.assessment.data.persistence;

import com.toeic.assessment.core.EventOutbox;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OutboxRepo extends JpaRepository<EventOutbox, UUID> {
    List<EventOutbox> findTop20ByPublishedFalseOrderByOccurredAtAsc();

    @Modifying
    @Query("update EventOutbox e set e.published = true where e.eventId = :eventId and e.published = false")
    int markPublished(@Param("eventId") UUID eventId);
}
