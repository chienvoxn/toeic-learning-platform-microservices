ALTER TABLE toeic_quizzes ADD COLUMN owner_user_id UUID;
ALTER TABLE toeic_quizzes ADD COLUMN version BIGINT NOT NULL DEFAULT 0 CHECK (version >= 0);
CREATE INDEX ix_toeic_quizzes_owner ON toeic_quizzes(owner_user_id, quiz_id);

ALTER TABLE toeic_questions ADD COLUMN position INTEGER CHECK (position > 0);
ALTER TABLE toeic_questions ADD COLUMN answer_pending BOOLEAN NOT NULL DEFAULT FALSE;
WITH existing_order AS (
    SELECT question_id, row_number() OVER (PARTITION BY quiz_id ORDER BY question_id)::integer AS position
    FROM toeic_questions
)
UPDATE toeic_questions q
SET position = existing_order.position
FROM existing_order
WHERE q.question_id = existing_order.question_id;
ALTER TABLE toeic_questions ADD CONSTRAINT uq_toeic_question_position UNIQUE (quiz_id, position);
