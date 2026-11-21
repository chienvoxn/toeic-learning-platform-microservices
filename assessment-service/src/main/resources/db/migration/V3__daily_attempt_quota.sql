
CREATE TABLE daily_attempt_usage (
    user_id UUID NOT NULL,
    quota_date DATE NOT NULL,
    used_count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, quota_date),
    CONSTRAINT chk_daily_usage_nonnegative
        CHECK (used_count >= 0)
);

-- Dong bo so luot da ton tai truoc khi nang cap.
INSERT INTO daily_attempt_usage (
    user_id,
    quota_date,
    used_count
)
SELECT
    user_id,
    (created_at AT TIME ZONE 'UTC')::date,
    COUNT(*)::integer
FROM attempts
GROUP BY
    user_id,
    (created_at AT TIME ZONE 'UTC')::date;
