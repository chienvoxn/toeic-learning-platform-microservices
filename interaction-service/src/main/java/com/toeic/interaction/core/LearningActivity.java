package com.toeic.interaction.core;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
@Entity @Table(name="learning_activities") public class LearningActivity {
 @Id UUID eventId;@Column(nullable=false) UUID userId;@Column(nullable=false) UUID attemptId;
 @Column(nullable=false) String kind;@Column(nullable=false) OffsetDateTime recordedAt;
 protected LearningActivity(){}public LearningActivity(UUID eventId,UUID userId,UUID attemptId,String kind){this.eventId=eventId;this.userId=userId;this.attemptId=attemptId;this.kind=kind;recordedAt=OffsetDateTime.now(ZoneOffset.UTC);}
 public UUID getEventId(){return eventId;}public UUID getUserId(){return userId;}public UUID getAttemptId(){return attemptId;}public String getKind(){return kind;}public OffsetDateTime getRecordedAt(){return recordedAt;}
}
