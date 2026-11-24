package com.toeic.content.entrypoints;

import com.toeic.content.adapters.security.IdentityClient;
import com.toeic.content.core.Quiz;
import com.toeic.content.core.QuizQuestion;
import com.toeic.content.data.persistence.QuizQuestionRepo;
import com.toeic.content.data.persistence.QuizRepo;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.util.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/ms/v1/contents")
public class QuizController {
    private final QuizRepo quizzes;
    private final QuizQuestionRepo questions;
    private final IdentityClient identity;
    private final byte[] internalKey;
    private final Path mediaStorageDir = Paths.get("/var/toeic/media").toAbsolutePath().normalize();

    QuizController(QuizRepo quizzes, QuizQuestionRepo questions, IdentityClient identity,
                   @Value("${services.internal-key}") String internalKey) {
        this.quizzes = quizzes;
        this.questions = questions;
        this.identity = identity;
        this.internalKey = internalKey.getBytes(StandardCharsets.UTF_8);
        try {
            Files.createDirectories(this.mediaStorageDir);
        } catch (IOException e) {
            System.err.println("Warning: could not create media storage dir: " + e.getMessage());
        }
    }

    public record QuizView(UUID id, String title, int part, boolean premium, long count) {}
    public record PublicQuestion(
            UUID id,
            String prompt,
            Map<String, String> choices,
            String passageText,
            String audioUrl,
            String imageUrl,
            UUID groupId
    ) {}
    public record QuizDetail(QuizView quiz, List<PublicQuestion> questions) {}
    public record InternalQuestion(
            UUID id,
            String prompt,
            Map<String, String> choices,
            String correctChoice,
            String explanation,
            String passageText,
            String audioUrl,
            String imageUrl,
            UUID groupId
    ) {}
    public record Snapshot(QuizView quiz, List<InternalQuestion> questions) {}

    public record QuestionInput(
            @NotNull @Size(max = 10000) String prompt,
            @NotNull @Size(max = 255) String a,
            @NotNull @Size(max = 255) String b,
            @NotNull @Size(max = 255) String c,
            @Size(max = 255) String d,
            @Pattern(regexp = "[A-D]?") String answer,
            @NotNull @Size(max = 10000) String explanation,
            @Size(max = 20000) String passageText,
            @Size(max = 512) String audioUrl,
            @Size(max = 512) String imageUrl,
            UUID groupId
    ) {}

    public record QuizInput(
            @NotNull @Size(max = 255) String title,
            @Min(1) @Max(7) int part,
            boolean premium,
            @NotNull @Size(max = 200) List<@NotNull @Valid QuestionInput> questions
    ) {}

    public record DraftUpdate(@NotNull @PositiveOrZero Long version, @Valid @NotNull QuizInput quiz) {}
    public record PublishRequest(@NotNull @PositiveOrZero Long version) {}
    public record OwnedQuiz(UUID id, String title, int part, boolean premium, long count, String status, long version) {}
    public record DraftDetail(OwnedQuiz quiz, List<QuestionInput> questions) {}

    public record AdminQuiz(UUID id, String title, int part, boolean premium, long count, String status,
                            long version, UUID ownerUserId) {}
    public record AdminQuizzes(List<AdminQuiz> quizzes, long total, int page, int size) {}
    public record AdminQuizDetail(AdminQuiz quiz, List<PublicQuestion> questions) {}
    public record VisibilityChange(@NotNull @PositiveOrZero Long version, @NotNull Boolean published) {}
    public record MediaUploadResponse(String url, String mediaType, long size) {}

    private void requireAdmin(String bearer) {
        if (!identity.actor(bearer).can("rbac:manage")) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    }

    private UUID author(String bearer) {
        var actor = identity.actor(bearer);
        if (!actor.can("content:write")) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return actor.userId();
    }

    // --- Media Upload & Secure Streaming ---

    @PostMapping("/media/upload")
    public MediaUploadResponse uploadMedia(
            @RequestHeader(value = "Authorization", required = false) String bearer,
            @RequestParam("file") MultipartFile file
    ) {
        author(bearer); // Require TEACHER / content:write

        if (file.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is empty");
        if (file.getSize() > 20 * 1024 * 1024) throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "File exceeds 20MB limit");

        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase(Locale.ROOT) : "";
        String ext = "";
        String mimeType = file.getContentType() != null ? file.getContentType().toLowerCase(Locale.ROOT) : "";

        if (originalName.endsWith(".mp3") || mimeType.contains("audio/mpeg") || mimeType.contains("audio/mp3")) {
            ext = ".mp3";
        } else if (originalName.endsWith(".wav") || mimeType.contains("audio/wav")) {
            ext = ".wav";
        } else if (originalName.endsWith(".jpg") || originalName.endsWith(".jpeg") || mimeType.contains("image/jpeg")) {
            ext = ".jpg";
        } else if (originalName.endsWith(".png") || mimeType.contains("image/png")) {
            ext = ".png";
        } else if (originalName.endsWith(".webp") || mimeType.contains("image/webp")) {
            ext = ".webp";
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported media format. Allowed: MP3, WAV, JPG, PNG, WEBP");
        }

        String mediaId = UUID.randomUUID().toString().replace("-", "") + ext;
        Path target = mediaStorageDir.resolve(mediaId).normalize();
        if (!target.startsWith(mediaStorageDir)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Path traversal attempt detected");
        }

        try (InputStream in = file.getInputStream()) {
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store media file");
        }

        String accessUrl = "/ms/v1/contents/media/" + mediaId;
        return new MediaUploadResponse(accessUrl, ext.replace(".", ""), file.getSize());
    }

    @GetMapping("/media/{filename:.+}")
    public ResponseEntity<Resource> serveMedia(@PathVariable String filename) {
        if (filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }

        Path file = mediaStorageDir.resolve(filename).normalize();
        if (!file.startsWith(mediaStorageDir) || !Files.exists(file)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }

        try {
            Resource resource = new UrlResource(file.toUri());
            String contentType = Files.probeContentType(file);
            if (contentType == null) {
                if (filename.endsWith(".mp3")) contentType = "audio/mpeg";
                else if (filename.endsWith(".wav")) contentType = "audio/wav";
                else if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) contentType = "image/jpeg";
                else if (filename.endsWith(".png")) contentType = "image/png";
                else contentType = "application/octet-stream";
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                    .body(resource);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error reading media file");
        }
    }

    // --- Quiz Catalog Endpoints ---

    @GetMapping("/quizzes")
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public List<QuizView> catalog() {
        return quizzes.findByPublishedTrueOrderByTitleAsc().stream()
                .map(quiz -> publicView(quiz, questions.countByQuizId(quiz.quizId))).toList();
    }

    @GetMapping("/quizzes/{id}")
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public QuizDetail detail(@PathVariable UUID id) {
        Quiz quiz = published(id);
        var rows = questions.findInQuizOrder(id);
        return new QuizDetail(publicView(quiz, rows.size()), rows.stream()
                .map(this::toPublicQuestion).toList());
    }

    @GetMapping("/quizzes/internal/{id}/snapshot")
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Snapshot snapshot(@PathVariable UUID id, @RequestHeader("X-Service-Key") String serviceKey) {
        if (!MessageDigest.isEqual(serviceKey.getBytes(StandardCharsets.UTF_8), internalKey)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        Quiz quiz = published(id);
        var rows = questions.findInQuizOrder(id);
        return new Snapshot(publicView(quiz, rows.size()), rows.stream()
                .map(this::toInternalQuestion).toList());
    }

    // --- Teacher Authoring Endpoints ---

    @PostMapping("/quizzes")
    @Transactional
    public QuizView create(@RequestHeader(value = "Authorization", required = false) String bearer,
                           @Valid @RequestBody QuizInput input) {
        UUID owner = author(bearer);
        requirePublishable(input.title(), input.part(), input.questions());
        var quiz = insert(owner, input, true);
        return publicView(quiz, input.questions().size());
    }

    @GetMapping("/quizzes/mine")
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public List<OwnedQuiz> mine(@RequestHeader(value = "Authorization", required = false) String bearer) {
        return quizzes.findByOwnerUserIdOrderByTitleAscQuizIdAsc(author(bearer)).stream()
                .map(quiz -> ownedView(quiz, questions.countByQuizId(quiz.quizId))).toList();
    }

    @PostMapping("/quizzes/drafts")
    @Transactional
    public DraftDetail createDraft(@RequestHeader(value = "Authorization", required = false) String bearer,
                                   @Valid @RequestBody QuizInput input) {
        var quiz = insert(author(bearer), input, false);
        return draftView(quiz, questions.findInQuizOrder(quiz.quizId));
    }

    @GetMapping("/quizzes/{id}/draft")
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public DraftDetail readDraft(@RequestHeader(value = "Authorization", required = false) String bearer, @PathVariable UUID id) {
        Quiz quiz = quizzes.findByQuizIdAndOwnerUserId(id, author(bearer)).orElseThrow(QuizController::notFound);
        requireDraft(quiz);
        return draftView(quiz, questions.findInQuizOrder(id));
    }

    @PutMapping("/quizzes/{id}/draft")
    @Transactional
    public DraftDetail updateDraft(@RequestHeader(value = "Authorization", required = false) String bearer, @PathVariable UUID id,
                                   @Valid @RequestBody DraftUpdate update) {
        Quiz quiz = lockDraft(id, author(bearer), update.version());
        QuizInput input = update.quiz();
        quiz.title = input.title();
        quiz.part = input.part();
        quiz.premium = input.premium();
        quiz.version++;
        questions.deleteAllForQuiz(id);
        saveQuestions(id, input.part(), input.questions());
        return draftView(quiz, questions.findInQuizOrder(id));
    }

    @PostMapping("/quizzes/{id}/publish")
    @Transactional
    public OwnedQuiz publish(@RequestHeader(value = "Authorization", required = false) String bearer, @PathVariable UUID id,
                             @Valid @RequestBody PublishRequest input) {
        Quiz quiz = lockDraft(id, author(bearer), input.version());
        var rows = questions.findInQuizOrder(id);
        requirePublishable(quiz.title, quiz.part, rows.stream().map(QuizController::editableQuestion).toList());
        quiz.published = true;
        quiz.version++;
        return ownedView(quiz, rows.size());
    }

    // --- Admin Endpoints ---

    @GetMapping("/quizzes/admin")
    @Transactional(readOnly = true)
    public AdminQuizzes adminList(@RequestHeader(value = "Authorization", required = false) String bearer,
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

    @GetMapping("/quizzes/admin/{id}")
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public AdminQuizDetail adminDetail(@RequestHeader(value = "Authorization", required = false) String bearer,
                                       @PathVariable UUID id) {
        requireAdmin(bearer);
        Quiz quiz = quizzes.findById(id).orElseThrow(QuizController::notFound);
        var rows = questions.findInQuizOrder(id);
        return new AdminQuizDetail(adminView(quiz, rows.size()), rows.stream()
                .map(this::toPublicQuestion).toList());
    }

    @PostMapping("/quizzes/admin/{id}/visibility")
    @Transactional
    public AdminQuiz setVisibility(@RequestHeader(value = "Authorization", required = false) String bearer,
                                   @PathVariable UUID id,
                                   @Valid @RequestBody VisibilityChange change) {
        requireAdmin(bearer);
        Quiz quiz = quizzes.findById(id).orElseThrow(QuizController::notFound);
        if (quiz.version != change.version()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }
        quiz.published = change.published();
        quiz.version++;
        return adminView(quiz, questions.countByQuizId(id));
    }

    // --- Helper Validation & Mapping Methods ---

    private Quiz published(UUID id) {
        return quizzes.findById(id).filter(quiz -> quiz.published).orElseThrow(QuizController::notFound);
    }

    private Quiz lockDraft(UUID id, UUID owner, long expectedVersion) {
        Quiz quiz = quizzes.findForWriteByQuizIdAndOwnerUserId(id, owner).orElseThrow(QuizController::notFound);
        requireDraft(quiz);
        if (quiz.version != expectedVersion) throw new ResponseStatusException(HttpStatus.CONFLICT);
        return quiz;
    }

    private static void requireDraft(Quiz quiz) {
        if (quiz.published) throw new ResponseStatusException(HttpStatus.CONFLICT);
    }

    private static void requirePublishable(String title, int part, List<QuestionInput> rows) {
        if (title.isBlank() || rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Title and questions cannot be empty");
        }

        for (int i = 0; i < rows.size(); i++) {
            QuestionInput q = rows.get(i);
            if (q.prompt().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Question " + (i + 1) + " prompt is blank");
            }
            if (q.a().isBlank() || q.b().isBlank() || q.c().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Question " + (i + 1) + " options A-C cannot be blank");
            }
            // Part 2 has exactly 3 choices (A, B, C)
            if (part == 2) {
                if (q.answer() == null || !List.of("A", "B", "C").contains(q.answer())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Part 2 question " + (i + 1) + " answer must be A, B, or C");
                }
            } else {
                // Other parts require option D and answer in A-D
                if (q.d() == null || q.d().isBlank()) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Question " + (i + 1) + " option D cannot be blank");
                }
                if (q.answer() == null || !List.of("A", "B", "C", "D").contains(q.answer())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Question " + (i + 1) + " answer must be A, B, C, or D");
                }
            }
            if (q.explanation().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Question " + (i + 1) + " explanation is required");
            }
        }
    }

    private Quiz insert(UUID owner, QuizInput input, boolean published) {
        Quiz quiz = quizzes.save(new Quiz(owner, input.title(), input.part(), input.premium(), published));
        saveQuestions(quiz.quizId, input.part(), input.questions());
        return quiz;
    }

    private void saveQuestions(UUID quizId, int part, List<QuestionInput> inputs) {
        var rows = new ArrayList<QuizQuestion>(inputs.size());
        for (int i = 0; i < inputs.size(); i++) {
            QuestionInput q = inputs.get(i);
            String answer = q.answer() == null || q.answer().isEmpty() ? null : q.answer();
            String optD = (part == 2) ? null : q.d();
            rows.add(new QuizQuestion(
                    quizId,
                    i + 1,
                    q.prompt(),
                    q.a(),
                    q.b(),
                    q.c(),
                    optD,
                    answer,
                    q.explanation(),
                    q.passageText(),
                    q.audioUrl(),
                    q.imageUrl(),
                    q.groupId()
            ));
        }
        questions.saveAll(rows);
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND);
    }

    private static Map<String, String> options(QuizQuestion q) {
        Map<String, String> opts = new LinkedHashMap<>();
        opts.put("A", q.optionA);
        opts.put("B", q.optionB);
        opts.put("C", q.optionC);
        if (q.optionD != null && !q.optionD.isBlank()) {
            opts.put("D", q.optionD);
        }
        return opts;
    }

    private PublicQuestion toPublicQuestion(QuizQuestion q) {
        return new PublicQuestion(q.questionId, q.prompt, options(q), q.passageText, q.audioUrl, q.imageUrl, q.groupId);
    }

    private InternalQuestion toInternalQuestion(QuizQuestion q) {
        return new InternalQuestion(
                q.questionId,
                q.prompt,
                options(q),
                q.correctChoice,
                q.explanation,
                q.passageText,
                q.audioUrl,
                q.imageUrl,
                q.groupId
        );
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
        return new QuestionInput(
                q.prompt,
                q.optionA,
                q.optionB,
                q.optionC,
                q.optionD,
                q.answerPending ? "" : q.correctChoice,
                q.explanation,
                q.passageText,
                q.audioUrl,
                q.imageUrl,
                q.groupId
        );
    }

    private AdminQuiz adminView(Quiz q) {
        return adminView(q, questions.countByQuizId(q.quizId));
    }

    private AdminQuiz adminView(Quiz q, long count) {
        return new AdminQuiz(q.quizId, q.title, q.part, q.premium, count,
                q.published ? "PUBLISHED" : "DRAFT", q.version, q.ownerUserId);
    }
}
