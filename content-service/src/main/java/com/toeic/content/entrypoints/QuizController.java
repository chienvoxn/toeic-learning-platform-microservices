package com.toeic.content.entrypoints;

import com.toeic.content.adapters.security.IdentityClient;
import com.toeic.content.core.Quiz;
import com.toeic.content.core.QuizQuestion;
import com.toeic.content.data.persistence.QuizQuestionRepo;
import com.toeic.content.data.persistence.QuizRepo;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/ms/v1/contents/quizzes")
class QuizController {
    private final QuizRepo quizzes;
    private final QuizQuestionRepo questions;
    private final IdentityClient identity;
    private final byte[] internalKey;

    QuizController(QuizRepo quizzes, QuizQuestionRepo questions, IdentityClient identity,
                   @Value("${services.internal-key}") String internalKey) {
        this.quizzes = quizzes;
        this.questions = questions;
        this.identity = identity;
        this.internalKey = internalKey.getBytes(StandardCharsets.UTF_8);
    }

    record QuizView(UUID id, String title, int part, boolean premium, long count) {}
    record PublicQuestion(UUID id, String prompt, Map<String, String> choices) {}
    record QuizDetail(QuizView quiz, List<PublicQuestion> questions) {}
    record InternalQuestion(UUID id, String prompt, Map<String, String> choices, String correctChoice, String explanation) {}
    record Snapshot(QuizView quiz, List<InternalQuestion> questions) {}

    record QuestionInput(@NotNull @Size(max = 10000) String prompt,
                         @NotNull @Size(max = 255) String a, @NotNull @Size(max = 255) String b,
                         @NotNull @Size(max = 255) String c, @NotNull @Size(max = 255) String d,
                         @Pattern(regexp = "[A-D]?") String answer,
                         @NotNull @Size(max = 10000) String explanation) {}
    record QuizInput(@NotNull @Size(max = 255) String title, @Min(1) @Max(7) int part, boolean premium,
                     @NotNull @Size(max = 200) List<@NotNull @Valid QuestionInput> questions) {}
    record DraftUpdate(@NotNull @PositiveOrZero Long version, @Valid @NotNull QuizInput quiz) {}
    record PublishRequest(@NotNull @PositiveOrZero Long version) {}
    record OwnedQuiz(UUID id, String title, int part, boolean premium, long count, String status, long version) {}
    record DraftDetail(OwnedQuiz quiz, List<QuestionInput> questions) {}

    record AdminQuiz(UUID id, String title, int part, boolean premium, long count, String status,
                     long version, UUID ownerUserId) {}
    record AdminQuizzes(List<AdminQuiz> quizzes, long total, int page, int size) {}
    record AdminQuizDetail(AdminQuiz quiz, List<PublicQuestion> questions) {}
    record VisibilityChange(@NotNull @PositiveOrZero Long version, @NotNull Boolean published) {}

    private void requireAdmin(String bearer) {
        if (!identity.actor(bearer).can("rbac:manage")) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    }

    @GetMapping("/admin")
    @Transactional(readOnly = true)
    AdminQuizzes adminList(@RequestHeader(value = "Authorization", required = false) String bearer,
                           @RequestParam(defaultValue = "") String q,
                           @RequestParam(defaultValue = "ALL") String status,
                           @RequestParam(defaultValue = "0") int part,
                           @RequestParam(defaultValue = "0") int page) {
        requireAdmin(bearer);
        if (q.length() > 120 || page < 0 || page > 100000 || part < 0 || part > 7
                || !List.of("ALL", "PUBLISHED", "DRAFT").contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }
        int size = 20;
        var result = quizzes.searchAdmin(q.trim(), status, part,
                PageRequest.of(page, size, Sort.by("title", "quizId")));
        return new AdminQuizzes(result.getContent().stream().map(this::adminView).toList(),
                result.getTotalElements(), page, size);
    }

    @GetMapping("/admin/{id}")
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    AdminQuizDetail adminDetail(@RequestHeader(value = "Authorization", required = false) String bearer,
                                @PathVariable UUID id) {
        requireAdmin(bearer);
        Quiz quiz = quizzes.findById(id).orElseThrow(QuizController::notFound);
        var rows = questions.findInQuizOrder(id);
        return new AdminQuizDetail(adminView(quiz, rows.size()), rows.stream()
                .map(q -> new PublicQuestion(q.questionId, q.prompt, options(q))).toList());
    }

    @PostMapping("/admin/{id}/visibility")
    @Transactional
    AdminQuiz setVisibility(@RequestHeader(value="Authorization",required=false) String bearer,
                            @PathVariable UUID id, @Valid @RequestBody VisibilityChange input) {
        requireAdmin(bearer);
        Quiz quiz = quizzes.lockAdmin(id).orElseThrow(QuizController::notFound);
        if (quiz.version != input.version()) throw new ResponseStatusException(HttpStatus.CONFLICT);
        if (quiz.published == input.published()) return adminView(quiz);
        if (input.published()) {
            var qs=questions.findInQuizOrder(id);
            requirePublishable(quiz.title,qs.stream().map(QuizController::editableQuestion).toList());
        }
        quiz.published = input.published();
        quiz.version++;
        return adminView(quiz);
    }

    private AdminQuiz adminView(Quiz quiz) {
        return adminView(quiz, questions.countByQuizId(quiz.quizId));
    }

    private AdminQuiz adminView(Quiz quiz, long count) {
        return new AdminQuiz(quiz.quizId, quiz.title, quiz.part, quiz.premium, count,
                quiz.published ? "PUBLISHED" : "DRAFT", quiz.version, quiz.ownerUserId);
    }

    @GetMapping
    @Transactional(readOnly = true)
    List<QuizView> list() {
        return quizzes.findByPublishedTrueOrderByPartAsc().stream()
                .map(quiz -> publicView(quiz, questions.countByQuizId(quiz.quizId))).toList();
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    QuizDetail detail(@PathVariable UUID id) {
        Quiz quiz = published(id);
        var rows = questions.findInQuizOrder(id);
        return new QuizDetail(publicView(quiz, rows.size()), rows.stream()
                .map(q -> new PublicQuestion(q.questionId, q.prompt, options(q))).toList());
    }

    @GetMapping("/internal/{id}/snapshot")
    @Transactional(readOnly = true)
    Snapshot internal(@PathVariable UUID id, @RequestHeader(value = "X-Service-Key", required = false) String secret) {
        if (secret == null || !MessageDigest.isEqual(internalKey, secret.getBytes(StandardCharsets.UTF_8))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        Quiz quiz = published(id);
        var rows = questions.findInQuizOrder(id);
        return new Snapshot(publicView(quiz, rows.size()), rows.stream()
                .map(q -> new InternalQuestion(q.questionId, q.prompt, options(q), q.correctChoice, q.explanation)).toList());
    }

    @PostMapping
    @Transactional
    QuizView create(@RequestHeader(value = "Authorization", required = false) String bearer,
                    @Valid @RequestBody QuizInput input) {
        UUID owner = author(bearer);
        requirePublishable(input.title(), input.questions());
        var quiz = insert(owner, input, true);
        return publicView(quiz, input.questions().size());
    }

    @GetMapping("/mine")
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    List<OwnedQuiz> mine(@RequestHeader(value = "Authorization", required = false) String bearer) {
        return quizzes.findByOwnerUserIdOrderByTitleAscQuizIdAsc(author(bearer)).stream()
                .map(quiz -> ownedView(quiz, questions.countByQuizId(quiz.quizId))).toList();
    }

    @PostMapping("/drafts")
    @Transactional
    DraftDetail createDraft(@RequestHeader(value = "Authorization", required = false) String bearer,
                            @Valid @RequestBody QuizInput input) {
        var quiz = insert(author(bearer), input, false);
        return draftView(quiz, questions.findInQuizOrder(quiz.quizId));
    }

    @GetMapping("/{id}/draft")
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    DraftDetail readDraft(@RequestHeader(value = "Authorization", required = false) String bearer, @PathVariable UUID id) {
        Quiz quiz = quizzes.findByQuizIdAndOwnerUserId(id, author(bearer)).orElseThrow(QuizController::notFound);
        requireDraft(quiz);
        return draftView(quiz, questions.findInQuizOrder(id));
    }

    @PutMapping("/{id}/draft")
    @Transactional
    DraftDetail updateDraft(@RequestHeader(value = "Authorization", required = false) String bearer, @PathVariable UUID id,
                            @Valid @RequestBody DraftUpdate update) {
        Quiz quiz = lockDraft(id, author(bearer), update.version());
        QuizInput input = update.quiz();
        quiz.title = input.title();
        quiz.part = input.part();
        quiz.premium = input.premium();
        quiz.version++;
        questions.deleteAllForQuiz(id);
        saveQuestions(id, input.questions());
        return draftView(quiz, questions.findInQuizOrder(id));
    }

    @PostMapping("/{id}/publish")
    @Transactional
    OwnedQuiz publish(@RequestHeader(value = "Authorization", required = false) String bearer, @PathVariable UUID id,
                      @Valid @RequestBody PublishRequest input) {
        Quiz quiz = lockDraft(id, author(bearer), input.version());
        var rows = questions.findInQuizOrder(id);
        requirePublishable(quiz.title, rows.stream().map(QuizController::editableQuestion).toList());
        quiz.published = true;
        quiz.version++;
        return ownedView(quiz, rows.size());
    }

    private UUID author(String bearer) {
        var actor = identity.actor(bearer);
        if (!actor.can("content:write")) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return actor.userId();
    }

    private Quiz published(UUID id) {
        return quizzes.findById(id).filter(quiz -> quiz.published).orElseThrow(QuizController::notFound);
    }

    private Quiz lockDraft(UUID id, UUID owner, long expectedVersion) {
        // The client version is checked under the same row lock used by every draft write.
        Quiz quiz = quizzes.findForWriteByQuizIdAndOwnerUserId(id, owner).orElseThrow(QuizController::notFound);
        requireDraft(quiz);
        if (quiz.version != expectedVersion) throw new ResponseStatusException(HttpStatus.CONFLICT);
        return quiz;
    }

    private static void requireDraft(Quiz quiz) {
        if (quiz.published) throw new ResponseStatusException(HttpStatus.CONFLICT);
    }

    private static void requirePublishable(String title, List<QuestionInput> rows) {
        if (title.isBlank() || rows.isEmpty() || rows.stream().anyMatch(q ->
                q.prompt().isBlank() || q.a().isBlank() || q.b().isBlank() || q.c().isBlank()
                        || q.d().isBlank() || q.answer() == null || q.answer().isBlank() || q.explanation().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }
    }

    private Quiz insert(UUID owner, QuizInput input, boolean published) {
        Quiz quiz = quizzes.save(new Quiz(owner, input.title(), input.part(), input.premium(), published));
        saveQuestions(quiz.quizId, input.questions());
        return quiz;
    }

    private void saveQuestions(UUID quizId, List<QuestionInput> inputs) {
        var rows = new ArrayList<QuizQuestion>(inputs.size());
        for (int i = 0; i < inputs.size(); i++) {
            QuestionInput q = inputs.get(i);
            String answer = q.answer() == null || q.answer().isEmpty() ? null : q.answer();
            rows.add(new QuizQuestion(quizId, i + 1, q.prompt(), q.a(), q.b(), q.c(), q.d(), answer, q.explanation()));
        }
        questions.saveAll(rows);
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND);
    }

    private static Map<String, String> options(QuizQuestion q) {
        return Map.of("A", q.optionA, "B", q.optionB, "C", q.optionC, "D", q.optionD);
    }

    private static QuizView publicView(Quiz quiz, long count) {
        return new QuizView(quiz.quizId, quiz.title, quiz.part, quiz.premium, count);
    }

    private static OwnedQuiz ownedView(Quiz quiz, long count) {
        return new OwnedQuiz(quiz.quizId, quiz.title, quiz.part, quiz.premium, count,
                quiz.published ? "PUBLISHED" : "DRAFT", quiz.version);
    }

    private static DraftDetail draftView(Quiz quiz, List<QuizQuestion> rows) {
        return new DraftDetail(ownedView(quiz, rows.size()), rows.stream().map(QuizController::editableQuestion).toList());
    }

    private static QuestionInput editableQuestion(QuizQuestion q) {
        return new QuestionInput(q.prompt, q.optionA, q.optionB, q.optionC, q.optionD,
                q.answerPending ? "" : q.correctChoice, q.explanation);
    }
}
