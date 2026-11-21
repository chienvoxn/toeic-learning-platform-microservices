package com.toeic.assessment;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface OutboxRepo extends JpaRepository<EventOutbox, UUID> {
    List<EventOutbox> findTop20ByPublishedFalseOrderByOccurredAtAsc();
}
