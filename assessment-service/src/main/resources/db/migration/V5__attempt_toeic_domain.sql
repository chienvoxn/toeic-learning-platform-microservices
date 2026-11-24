-- V5: Extend attempt question snapshot with TOEIC domain fields (passage_text, audio_url, image_url, group_id, optional option_d)

ALTER TABLE attempt_questions ALTER COLUMN option_d DROP NOT NULL;
ALTER TABLE attempt_questions ALTER COLUMN option_d DROP DEFAULT;

ALTER TABLE attempt_questions ADD COLUMN passage_text TEXT;
ALTER TABLE attempt_questions ADD COLUMN audio_url VARCHAR(512);
ALTER TABLE attempt_questions ADD COLUMN image_url VARCHAR(512);
ALTER TABLE attempt_questions ADD COLUMN group_id UUID;

CREATE INDEX ix_attempt_questions_group ON attempt_questions(attempt_id, group_id);
