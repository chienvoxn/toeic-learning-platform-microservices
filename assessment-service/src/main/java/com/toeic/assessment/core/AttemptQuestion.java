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

    @Column(name = "option_d", nullable = false)
    String optionD;

    @Column(nullable = false, columnDefinition = "text")
    String explanation;

    protected AttemptQuestion() {
    }

    AttemptQuestion(
            UUID attemptId,
            UUID questionId,
            String prompt,
            String optionA,
            String optionB,
            String optionC,
            String optionD,
            String correctChoice,
            String explanation
    ) {
        this.attemptId = attemptId;
        this.questionId = questionId;
        this.prompt = prompt;
        this.optionA = optionA;
        this.optionB = optionB;
        this.optionC = optionC;
        this.optionD = optionD;
        this.correctChoice = correctChoice;
        this.explanation = explanation;
    }

    void selectChoice(String choice) {
        if (!ALLOWED_CHOICES.contains(choice)) {
            throw new IllegalArgumentException("Choice must be A, B, C, or D");
        }
        selectedChoice = choice;
    }

    boolean isCorrect() {
        return correctChoice.equals(selectedChoice);
    }
}
