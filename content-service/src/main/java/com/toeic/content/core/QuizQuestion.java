package com.toeic.content.core;
import jakarta.persistence.*;
import java.util.UUID;
@Entity @Table(name="toeic_questions") public class QuizQuestion {
 @Id public UUID questionId;@Column(nullable=false) UUID quizId;@Column(nullable=false,columnDefinition="text") public String prompt;
 @Column(name="option_a",nullable=false) public String optionA;@Column(name="option_b",nullable=false) public String optionB;@Column(name="option_c",nullable=false) public String optionC;@Column(name="option_d",nullable=false) public String optionD;
 @Column(nullable=false) public String correctChoice;@Column(nullable=false,columnDefinition="text") public String explanation;
 protected QuizQuestion(){} public QuizQuestion(UUID quiz,String prompt,String a,String b,String c,String d,String correct,String explanation){questionId=UUID.randomUUID();quizId=quiz;this.prompt=prompt;optionA=a;optionB=b;optionC=c;optionD=d;correctChoice=correct;this.explanation=explanation;}
}
