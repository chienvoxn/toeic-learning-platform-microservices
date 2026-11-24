package com.toeic.assessment.core;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class AttemptDomainTest {
    private static AttemptQuestion question(Attempt attempt, String correct) {
        return new AttemptQuestion(
                attempt.attemptId,
                UUID.randomUUID(),
                null,
                "Sample question", "one", "two", "three", "four",
                correct, "Explanation"
        );
    }

    @Test
    void answerAndGradeChangesStateAndCountsCorrectAnswers() {
        Attempt attempt = new Attempt(UUID.randomUUID(), UUID.randomUUID());
        AttemptQuestion first = question(attempt, "A");
        AttemptQuestion second = question(attempt, "B");
        attempt.answer(first, "A");
        attempt.answer(second, "C");

        assertTrue(attempt.grade(List.of(first, second)));
        assertEquals(AttemptStatus.GRADED, attempt.status);
        assertEquals(1, attempt.correctCount);
        assertNotNull(attempt.gradedAt);
    }

    @Test
    void repeatedGradingDoesNotChangeStoredResult() {
        Attempt attempt = new Attempt(UUID.randomUUID(), UUID.randomUUID());
        AttemptQuestion question = question(attempt, "B");
        attempt.answer(question, "B");
        assertTrue(attempt.grade(List.of(question)));
        var firstTime = attempt.gradedAt;

        assertFalse(attempt.grade(List.of(question)));
        assertEquals(1, attempt.correctCount);
        assertEquals(firstTime, attempt.gradedAt);
    }

    @Test
    void cannotAnswerAfterGrading() {
        Attempt attempt = new Attempt(UUID.randomUUID(), UUID.randomUUID());
        AttemptQuestion question = question(attempt, "A");
        attempt.grade(List.of(question));

        assertThrows(IllegalStateException.class, () -> attempt.answer(question, "A"));
    }

    @Test
    void cannotAnswerQuestionBelongingToAnotherAttempt() {
        Attempt mine = new Attempt(UUID.randomUUID(), UUID.randomUUID());
        Attempt other = new Attempt(UUID.randomUUID(), UUID.randomUUID());
        AttemptQuestion foreign = question(other, "A");

        assertThrows(IllegalArgumentException.class, () -> mine.answer(foreign, "A"));
    }

    @Test
    void invalidChoiceIsRejectedByDomain() {
        Attempt attempt = new Attempt(UUID.randomUUID(), UUID.randomUUID());
        AttemptQuestion question = question(attempt, "A");

        assertThrows(IllegalArgumentException.class, () -> attempt.answer(question, "E"));
    }

    @Test
    void part2ThreeChoiceQuestionRejectsChoiceD() {
        Attempt attempt = new Attempt(UUID.randomUUID(), UUID.randomUUID());
        AttemptQuestion part2Question = new AttemptQuestion(
                attempt.attemptId,
                UUID.randomUUID(),
                1,
                "Part 2 question", "Choice A", "Choice B", "Choice C", null,
                "B", "Explanation", null, "/media/p2.mp3", null, null
        );

        attempt.answer(part2Question, "C");
        assertEquals("C", part2Question.selectedChoice);
        assertThrows(IllegalArgumentException.class, () -> attempt.answer(part2Question, "D"));
    }
}
