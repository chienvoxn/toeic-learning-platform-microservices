package com.toeic.assessment.data.persistence;

import com.toeic.assessment.core.EventOutbox;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OutboxRepo extends JpaRepository<EventOutbox, UUID> {
    List<EventOutbox> findTop20ByPublishedFalseOrderByOccurredAtAsc();
}
