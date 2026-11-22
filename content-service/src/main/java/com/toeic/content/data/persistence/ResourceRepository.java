package com.toeic.content.data.persistence;
import com.toeic.content.core.LearningResource;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ResourceRepository extends JpaRepository<LearningResource,UUID>{List<LearningResource> findByOwnerUserId(UUID userId);}
