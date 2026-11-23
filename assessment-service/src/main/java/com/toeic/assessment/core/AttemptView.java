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
    record Question(
            UUID id,
            Integer position,
            String prompt,
            Map<String, String> choices,
            String selectedChoice,
            Boolean correct,
            String explanation
    ) {}
}
