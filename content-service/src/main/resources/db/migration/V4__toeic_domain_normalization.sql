-- V4: Support TOEIC Listening & Reading domain (Passages, Grouped Questions, Media references, Part 2 3-choice support)

-- Allow Part 2 questions to omit option_d (nullable)
ALTER TABLE toeic_questions ALTER COLUMN option_d DROP NOT NULL;

-- Support shared passage texts (Part 6, Part 7)
ALTER TABLE toeic_questions ADD COLUMN passage_text TEXT;

-- Support audio URL and image URL (Part 1, Part 2, Part 3, Part 4)
ALTER TABLE toeic_questions ADD COLUMN audio_url VARCHAR(512);
ALTER TABLE toeic_questions ADD COLUMN image_url VARCHAR(512);

-- Support question group clustering (UUID group_id to cluster 3-4 questions sharing the same audio or passage)
ALTER TABLE toeic_questions ADD COLUMN group_id UUID;
CREATE INDEX ix_toeic_questions_group ON toeic_questions(group_id);
