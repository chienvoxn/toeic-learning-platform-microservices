package com.toeic.content.core;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "toeic_questions")
public class QuizQuestion {
    @Id
    public UUID questionId;

    @Column(nullable = false)
    public UUID quizId;

    @Column(nullable = false, columnDefinition = "text")
    public String prompt;

    @Column(name = "option_a", nullable = false)
    public String optionA;

    @Column(name = "option_b", nullable = false)
    public String optionB;

    @Column(name = "option_c", nullable = false)
    public String optionC;

    @Column(name = "option_d")
    public String optionD;

    @Column(nullable = false)
    public String correctChoice;

    @Column(nullable = false)
    public boolean answerPending;

    @Column(nullable = false, columnDefinition = "text")
    public String explanation;

    public Integer position;

    @Column(name = "passage_text", columnDefinition = "text")
    public String passageText;

    @Column(name = "audio_url", length = 512)
    public String audioUrl;

    @Column(name = "image_url", length = 512)
    public String imageUrl;

    @Column(name = "group_id")
    public UUID groupId;

    protected QuizQuestion() {}

    public QuizQuestion(
            UUID quiz,
            int position,
            String prompt,
            String a,
            String b,
            String c,
            String d,
            String correct,
            String explanation,
            String passageText,
            String audioUrl,
            String imageUrl,
            UUID groupId
    ) {
        this.questionId = UUID.randomUUID();
        this.quizId = quiz;
        this.position = position;
        this.prompt = prompt;
        this.optionA = a;
        this.optionB = b;
        this.optionC = c;
        this.optionD = d;
        this.answerPending = correct == null;
        this.correctChoice = answerPending ? "A" : correct;
        this.explanation = explanation;
        this.passageText = passageText;
        this.audioUrl = audioUrl;
        this.imageUrl = imageUrl;
        this.groupId = groupId;
    }

    // Overload for backward compatibility
    public QuizQuestion(UUID quiz, int position, String prompt, String a, String b, String c, String d, String correct, String explanation) {
        this(quiz, position, prompt, a, b, c, d, correct, explanation, null, null, null, null);
    }
}
