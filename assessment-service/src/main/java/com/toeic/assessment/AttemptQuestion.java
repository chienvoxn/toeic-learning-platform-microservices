package com.toeic.assessment;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "attempt_questions")
@IdClass(AttemptQuestionKey.class)
class AttemptQuestion {
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
}
