\set ON_ERROR_STOP on
\if :{?phase3b_after}
\else
    \set phase3b_after false
\endif

BEGIN READ ONLY;

DO $$
BEGIN
    IF current_database() !~ '^phase3b_[a-z0-9_]+$'
       OR current_setting('server_version_num')::integer NOT BETWEEN 170000 AND 179999 THEN
        RAISE EXCEPTION 'Use an isolated phase3b_* PostgreSQL 17 database';
    END IF;
END
$$;

-- Save this line before and after the migration. It excludes the V3 columns.
WITH quizzes AS (
    SELECT quiz_id, title, part, premium, published FROM toeic_quizzes
), questions AS (
    SELECT question_id, quiz_id, prompt, option_a, option_b, option_c, option_d, correct_choice, explanation
    FROM toeic_questions
)
SELECT 'legacy_fingerprint=' || jsonb_build_object(
    'quizzes', (SELECT count(*) FROM quizzes),
    'published', (SELECT count(*) FROM quizzes WHERE published),
    'quiz_ids', (SELECT md5(coalesce(string_agg(quiz_id::text, ',' ORDER BY quiz_id), '')) FROM quizzes),
    'quiz_data', (SELECT md5(coalesce(jsonb_agg(to_jsonb(q) ORDER BY quiz_id)::text, '[]')) FROM quizzes q),
    'questions', (SELECT count(*) FROM questions),
    'question_ids', (SELECT md5(coalesce(string_agg(question_id::text, ',' ORDER BY question_id), '')) FROM questions),
    'question_data', (SELECT md5(coalesce(jsonb_agg(to_jsonb(q) ORDER BY question_id)::text, '[]')) FROM questions q)
)::text;

\if :phase3b_after
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM flyway_schema_history WHERE version = '3' AND success) THEN
            RAISE EXCEPTION 'Flyway V3 has not been applied';
        END IF;
        IF EXISTS (SELECT 1 FROM toeic_quizzes WHERE owner_user_id IS NOT NULL OR version <> 0) THEN
            RAISE EXCEPTION 'A legacy quiz has an owner or a nonzero version';
        END IF;
        IF EXISTS (
            SELECT 1 FROM (
                SELECT position, answer_pending, row_number() OVER (PARTITION BY quiz_id ORDER BY question_id) AS expected
                FROM toeic_questions
            ) ranked
            WHERE position IS DISTINCT FROM expected OR answer_pending
        ) THEN
            RAISE EXCEPTION 'Legacy question order or answer backfill differs';
        END IF;
    END
    $$;
    SELECT 'PASS Flyway V3, null legacy ownership and backfill';
\else
    DO $$
    BEGIN
        IF (SELECT version FROM flyway_schema_history WHERE success AND version IS NOT NULL
            ORDER BY installed_rank DESC LIMIT 1) IS DISTINCT FROM '2' THEN
            RAISE EXCEPTION 'Expected Flyway V2 for the baseline';
        END IF;
    END
    $$;
    SELECT 'PASS Flyway V2 baseline';
\endif

ROLLBACK;
