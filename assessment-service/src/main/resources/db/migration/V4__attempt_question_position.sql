-- Existing snapshots have no recorded position. Keep NULL and read them by question_id.
-- The nullable column also lets an older Assessment binary write during application rollback.
ALTER TABLE attempt_questions ADD COLUMN position INTEGER;
ALTER TABLE attempt_questions ADD CONSTRAINT chk_attempt_question_position CHECK (position > 0);
ALTER TABLE attempt_questions ADD CONSTRAINT uq_attempt_question_position UNIQUE (attempt_id, position);
