package com.toeic.assessment;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

// Response model shared between the application service and the REST adapter.
// A later step can move this to a dedicated application API package.
record AttemptView(
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
            String prompt,
            Map<String, String> choices,
            String selectedChoice,
            Boolean correct,
            String explanation
    ) {}
}
