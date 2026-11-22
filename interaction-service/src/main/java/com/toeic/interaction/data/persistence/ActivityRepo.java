package com.toeic.interaction.data.persistence;
import com.toeic.interaction.core.LearningActivity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ActivityRepo extends JpaRepository<LearningActivity,UUID>{List<LearningActivity> findByUserIdOrderByRecordedAtDesc(UUID userId);}
