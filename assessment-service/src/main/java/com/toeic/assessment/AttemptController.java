package com.toeic.assessment;
import java.time.ZoneOffset;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/ms/v1/attempts")
class AttemptController {
    private final AttemptRepo attempts;
    private final AttemptQuestionRepo questions;
    private final OutboxRepo outbox;
    private final IdentityClient identity;
    private final QuizClient quizzes;
    private final DailyAttemptQuota dailyQuota;

    AttemptController(
            AttemptRepo attempts,
            AttemptQuestionRepo questions,
            OutboxRepo outbox,
            IdentityClient identity,
            QuizClient quizzes,
            DailyAttemptQuota dailyQuota
    ) {
        this.attempts = attempts;
        this.questions = questions;
        this.outbox = outbox;
        this.identity = identity;
        this.quizzes = quizzes;
        this.dailyQuota = dailyQuota;
    }

    record Start(@NotNull UUID quizId) {
    }

    record Answer(@NotNull @Pattern(regexp = "A|B|C|D") String choice) {
    }

    record Question(
            UUID id,
            String prompt,
            Map<String, String> choices,
            String selectedChoice,
            Boolean correct,
            String explanation
    ) {
    }

    record View(
            UUID id,
            UUID quizId,
            String status,
            int total,
            Integer correct,
            OffsetDateTime createdAt,
            List<Question> questions
    ) {
    }

    private List<Question> projection(UUID attemptId, boolean graded) {
        return questions.findByAttemptId(attemptId).stream()
                .map(q -> new Question(
                        q.questionId,
                        q.prompt,
                        Map.of(
                                "A", q.optionA,
                                "B", q.optionB,
                                "C", q.optionC,
                                "D", q.optionD
                        ),
                        q.selectedChoice,
                        graded ? q.correctChoice.equals(q.selectedChoice) : null,
                        graded ? q.explanation : null
                ))
                .toList();
    }

    private View view(Attempt attempt) {
        var attemptQuestions = projection(
                attempt.attemptId,
                "GRADED".equals(attempt.status)
        );
        return new View(
                attempt.attemptId,
                attempt.quizId,
                attempt.status,
                attemptQuestions.size(),
                attempt.correctCount,
                attempt.createdAt,
                attemptQuestions
        );
    }

    private Attempt own(UUID userId, UUID attemptId) {
        return attempts.findById(attemptId)
                .filter(attempt -> attempt.userId.equals(userId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @PostMapping
    @Transactional
    View start(
            @RequestHeader(value = "Authorization", required = false) String bearer,
            @Valid @RequestBody Start input
    ) {
        var actor = identity.actor(bearer);
        if (!actor.can("assessment:submit")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }

        UUID userId = actor.userId();
        var snapshot = quizzes.snapshot(input.quizId());
        var entitlement = quizzes.entitlement(userId);

        if (snapshot.premium() && !"PRO".equals(entitlement.plan())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Premium membership required"
            );
        }

        // Atomic reservation: the quota update and attempt creation share
        // this method's database transaction. An exception rolls back both.
        dailyQuota.reserve(userId, entitlement.dailyLimit());

        var attempt = attempts.save(new Attempt(input.quizId(), userId));
        for (var question : snapshot.questions()) {
            questions.save(new AttemptQuestion(
                    attempt.attemptId,
                    question.id(),
                    question.prompt(),
                    question.options().get("A"),
                    question.options().get("B"),
                    question.options().get("C"),
                    question.options().get("D"),
                    question.correctChoice(),
                    question.explanation()
            ));
        }

        return view(attempt);
    }

    @GetMapping
    @Transactional(readOnly = true)
    List<View> mine(
            @RequestHeader(value = "Authorization", required = false) String bearer
    ) {
        return attempts.findByUserIdOrderByCreatedAtDesc(identity.requireUser(bearer))
                .stream()
                .map(this::view)
                .toList();
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    View get(
            @RequestHeader(value = "Authorization", required = false) String bearer,
            @PathVariable UUID id
    ) {
        return view(own(identity.requireUser(bearer), id));
    }

    @PutMapping("/{id}/answers/{questionId}")
    @Transactional
    View answer(
            @RequestHeader(value = "Authorization", required = false) String bearer,
            @PathVariable UUID id,
            @PathVariable UUID questionId,
            @Valid @RequestBody Answer input
    ) {
        UUID userId = identity.requireUser(bearer);
        Attempt attempt = attempts.lockOwn(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (!"IN_PROGRESS".equals(attempt.status)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Already graded");
        }

        var key = new AttemptQuestionKey();
        key.attemptId = id;
        key.questionId = questionId;

        var question = questions.findById(key)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        question.selectedChoice = input.choice();
        questions.save(question);
        return view(attempt);
    }

    @PostMapping("/{id}/submit")
    @Transactional
    View submit(
            @RequestHeader(value = "Authorization", required = false) String bearer,
            @PathVariable UUID id
    ) {
        UUID userId = identity.requireUser(bearer);
        Attempt attempt = attempts.lockOwn(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (!"GRADED".equals(attempt.status)) {
            attempt.correctCount = (int) questions.findByAttemptId(id).stream()
                    .filter(q -> q.correctChoice.equals(q.selectedChoice))
                    .count();
            attempt.status = "GRADED";
            attempt.gradedAt = OffsetDateTime.now(ZoneOffset.UTC);
            attempts.save(attempt);
            outbox.save(new EventOutbox(attempt));
        }

        return view(attempt);
    }
}
