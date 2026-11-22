package com.toeic.interaction.data.persistence;
import com.toeic.interaction.core.ContentReview;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ContentReviewRepository extends JpaRepository<ContentReview,UUID>{
 Optional<ContentReview> findByUserIdAndContentId(UUID userId,UUID contentId);
 List<ContentReview> findTop50ByContentIdOrderByCreatedAtDesc(UUID contentId);
}
