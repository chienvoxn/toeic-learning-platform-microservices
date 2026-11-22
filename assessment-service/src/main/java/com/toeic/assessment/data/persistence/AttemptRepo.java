package com.toeic.assessment.data.persistence;

import com.toeic.assessment.core.Attempt;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface AttemptRepo extends JpaRepository<Attempt, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from Attempt a where a.attemptId = :id and a.userId = :user")
    Optional<Attempt> lockOwn(@Param("id") UUID id, @Param("user") UUID user);

    List<Attempt> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
