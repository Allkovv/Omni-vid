-- Запустить, если база уже создана по предыдущему SQL-скрипту.
ALTER TABLE subjects
ADD COLUMN IF NOT EXISTS study_hours INTEGER NOT NULL DEFAULT 0
CHECK (study_hours >= 0);

-- После миграции при необходимости обновите представления из schema.sql.
