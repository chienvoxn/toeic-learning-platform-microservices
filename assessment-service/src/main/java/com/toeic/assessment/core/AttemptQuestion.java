package com.toeic.assessment.core;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "attempt_questions")
@IdClass(AttemptQuestionKey.class)
public class AttemptQuestion {
    private static final Set<String> ALLOWED_CHOICES = Set.of("A", "B", "C", "D");

    @Id
    UUID attemptId;

    @Id
    UUID questionId;

    @Column(updatable = false)
    Integer position;

    @Column(nullable = false, columnDefinition = "text")
    String prompt;

    @Column(nullable = false)
    String correctChoice;

    String selectedChoice;

    @Column(name = "option_a", nullable = false)
    String optionA;

    @Column(name = "option_b", nullable = false)
    String optionB;

    @Column(name = "option_c", nullable = false)
    String optionC;

    @Column(name = "option_d")
    String optionD;

    @Column(name = "passage_text", columnDefinition = "text")
    String passageText;

    @Column(name = "audio_url", length = 512)
    String audioUrl;

    @Column(name = "image_url", length = 512)
    String imageUrl;

    @Column(name = "group_id")
    UUID groupId;

    @Column(nullable = false, columnDefinition = "text")
    String explanation;

    protected AttemptQuestion() {
    }

    AttemptQuestion(
            UUID attemptId,
            UUID questionId,
            Integer position,
            String prompt,
            String optionA,
            String optionB,
            String optionC,
            String optionD,
            String correctChoice,
            String explanation,
            String passageText,
            String audioUrl,
            String imageUrl,
            UUID groupId
    ) {
        this.attemptId = attemptId;
        this.questionId = questionId;
        this.position = position;
        this.prompt = prompt;
        this.optionA = optionA;
        this.optionB = optionB;
        this.optionC = optionC;
        this.optionD = optionD;
        this.correctChoice = correctChoice;
        this.explanation = explanation;
        this.passageText = passageText;
        this.audioUrl = audioUrl;
        this.imageUrl = imageUrl;
        this.groupId = groupId;
    }

    AttemptQuestion(
            UUID attemptId,
            UUID questionId,
            Integer position,
            String prompt,
            String optionA,
            String optionB,
            String optionC,
            String optionD,
            String correctChoice,
            String explanation
    ) {
        this(attemptId, questionId, position, prompt, optionA, optionB, optionC, optionD, correctChoice, explanation, null, null, null, null);
    }

    void selectChoice(String choice) {
        Set<String> valid = (optionD == null || optionD.isBlank()) ? Set.of("A", "B", "C") : ALLOWED_CHOICES;
        if (!valid.contains(choice)) {
            throw new IllegalArgumentException("Choice must be in " + valid);
        }
        selectedChoice = choice;
    }

    boolean isCorrect() {
        return correctChoice.equals(selectedChoice);
    }
}
