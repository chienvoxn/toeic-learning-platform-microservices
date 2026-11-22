package com.toeic.content.core;
import jakarta.persistence.*;
import java.util.UUID;
@Entity @Table(name="learning_resources") public class LearningResource {
 @Id public UUID resourceId; @Column(nullable=false) public UUID ownerUserId; @Column(nullable=false) public String title;
 @Column(nullable=false,columnDefinition="text") public String body; @Column(nullable=false) public String visibility;
 @Version Integer version=0;
 protected LearningResource(){}
 public LearningResource(UUID owner,String title,String body){resourceId=UUID.randomUUID();ownerUserId=owner;this.title=title;this.body=body;visibility="PRIVATE";}
}
