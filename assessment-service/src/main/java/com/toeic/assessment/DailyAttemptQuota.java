
package com.toeic.assessment;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class DailyAttemptQuota {

    private final JdbcTemplate jdbc;

    public DailyAttemptQuota(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void reserve(UUID userId, int dailyLimit) {
        if (dailyLimit <= 0) {
            throw new ResponseStatusException(
                HttpStatus.TOO_MANY_REQUESTS,
                "Daily practice quota exceeded"
            );
        }

        LocalDate today = LocalDate.now(ZoneOffset.UTC);

        int affectedRows = jdbc.update("""
            INSERT INTO daily_attempt_usage
                (user_id, quota_date, used_count)
            VALUES (?, ?, 1)
            ON CONFLICT (user_id, quota_date)
            DO UPDATE SET
                used_count = daily_attempt_usage.used_count + 1
            WHERE daily_attempt_usage.used_count < ?
            """,
            userId,
            today,
            dailyLimit
        );

        if (affectedRows == 0) {
            throw new ResponseStatusException(
                HttpStatus.TOO_MANY_REQUESTS,
                "Daily practice quota exceeded"
            );
        }
    }
}
