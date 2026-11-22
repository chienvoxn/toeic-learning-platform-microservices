package com.toeic.content.core;
import jakarta.persistence.*;
import java.util.UUID;
@Entity @Table(name="toeic_quizzes") public class Quiz {
 @Id public UUID quizId;@Column(nullable=false) public String title;@Column(nullable=false) public int part;@Column(nullable=false) public boolean premium;@Column(nullable=false) public boolean published;
 protected Quiz(){} public Quiz(String title,int part,boolean premium){quizId=UUID.randomUUID();this.title=title;this.part=part;this.premium=premium;this.published=true;}
}
