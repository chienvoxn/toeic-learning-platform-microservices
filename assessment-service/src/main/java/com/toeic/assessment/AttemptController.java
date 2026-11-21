package com.toeic.assessment;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.LockModeType;
import jakarta.persistence.Table;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

@Entity
@Table(name = "attempts")
class Attempt {
    @Id
    UUID attemptId;

    @Column(nullable = false)
    UUID userId;

    @Column(nullable = false)
    UUID quizId;

    @Column(nullable = false)
    String status = "IN_PROGRESS";

    @Column(nullable = false)
    OffsetDateTime createdAt;

    Integer correctCount;
    OffsetDateTime gradedAt;

    protected Attempt() {
    }

    Attempt(UUID quizId, UUID userId) {
        this.attemptId = UUID.randomUUID();
        this.quizId = quizId;
        this.userId = userId;
        this.createdAt = OffsetDateTime.now(ZoneOffset.UTC);
    }
}

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

interface AttemptRepo extends JpaRepository<Attempt, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from Attempt a where a.attemptId = :id and a.userId = :user")
    Optional<Attempt> lockOwn(@Param("id") UUID id, @Param("user") UUID user);

    List<Attempt> findByUserIdOrderByCreatedAtDesc(UUID userId);
}

interface AttemptQuestionRepo extends JpaRepository<AttemptQuestion, AttemptQuestionKey> {
    List<AttemptQuestion> findByAttemptId(UUID attemptId);
}

@Entity
@Table(name = "event_outbox")
class EventOutbox {
    @Id
    UUID eventId;

    @Column(nullable = false)
    UUID aggregateId;

    @Column(nullable = false)
    UUID actorId;

    @Column(nullable = false)
    String eventType;

    @Column(nullable = false)
    boolean published = false;

    @Column(nullable = false)
    OffsetDateTime occurredAt;

    protected EventOutbox() {
    }

    EventOutbox(Attempt attempt) {
        this.eventId = UUID.randomUUID();
        this.aggregateId = attempt.attemptId;
        this.actorId = attempt.userId;
        this.eventType = "AttemptGraded";
        this.occurredAt = OffsetDateTime.now(ZoneOffset.UTC);
    }
}

interface OutboxRepo extends JpaRepository<EventOutbox, UUID> {
    List<EventOutbox> findTop20ByPublishedFalseOrderByOccurredAtAsc();
}

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
