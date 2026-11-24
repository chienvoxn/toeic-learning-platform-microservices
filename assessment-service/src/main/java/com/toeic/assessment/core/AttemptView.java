package com.toeic.assessment.core;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

// Response model shared between the application service and the REST adapter.
public record AttemptView(
        UUID id,
        UUID quizId,
        String status,
        int total,
        Integer correct,
        OffsetDateTime createdAt,
        List<Question> questions
) {
    public record Question(
            UUID id,
            Integer position,
            String prompt,
            Map<String, String> choices,
            String selectedChoice,
            Boolean correct,
            String explanation,
            String passageText,
            String audioUrl,
            String imageUrl,
            UUID groupId
    ) {
        public Question(
                UUID id,
                Integer position,
                String prompt,
                Map<String, String> choices,
                String selectedChoice,
                Boolean correct,
                String explanation
        ) {
            this(id, position, prompt, choices, selectedChoice, correct, explanation, null, null, null, null);
        }
    }
}
