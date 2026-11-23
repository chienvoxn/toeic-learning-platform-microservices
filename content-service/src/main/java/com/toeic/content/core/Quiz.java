package com.toeic.content.core;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "toeic_quizzes")
public class Quiz {
    @Id public UUID quizId;
    @Column(nullable = false) public String title;
    @Column(nullable = false) public int part;
    @Column(nullable = false) public boolean premium;
    @Column(nullable = false) public boolean published;
    @Column(updatable = false) public UUID ownerUserId;
    @Column(nullable = false) public long version;

    protected Quiz() {}

    public Quiz(UUID ownerUserId, String title, int part, boolean premium, boolean published) {
        this.quizId = UUID.randomUUID();
        this.ownerUserId = ownerUserId;
        this.title = title;
        this.part = part;
        this.premium = premium;
        this.published = published;
    }
}
