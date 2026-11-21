package com.toeic.assessment;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/ms/v1/attempts")
class AttemptController {
    private final AttemptApplicationService application;

    AttemptController(AttemptApplicationService application) {
        this.application = application;
    }

    record Start(@NotNull UUID quizId) {}

    record Answer(@NotNull @Pattern(regexp = "A|B|C|D") String choice) {}

    @PostMapping
    AttemptView start(
            @RequestHeader(value = "Authorization", required = false) String bearer,
            @Valid @RequestBody Start input
    ) {
        return application.start(bearer, input.quizId());
    }

    @GetMapping
    List<AttemptView> mine(
            @RequestHeader(value = "Authorization", required = false) String bearer
    ) {
        return application.mine(bearer);
    }

    @GetMapping("/{id}")
    AttemptView get(
            @RequestHeader(value = "Authorization", required = false) String bearer,
            @PathVariable UUID id
    ) {
        return application.get(bearer, id);
    }

    @PutMapping("/{id}/answers/{questionId}")
    AttemptView answer(
            @RequestHeader(value = "Authorization", required = false) String bearer,
            @PathVariable UUID id,
            @PathVariable UUID questionId,
            @Valid @RequestBody Answer input
    ) {
        return application.answer(bearer, id, questionId, input.choice());
    }

    @PostMapping("/{id}/submit")
    AttemptView submit(
            @RequestHeader(value = "Authorization", required = false) String bearer,
            @PathVariable UUID id
    ) {
        return application.submit(bearer, id);
    }
}
