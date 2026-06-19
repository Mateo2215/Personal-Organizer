-- Personal Organizer — migracja 0004: wyprzedzenie przypomnienia.
-- 0 = o terminie (domyślne, dotychczasowe zachowanie), 15/30/60 = tyle minut przed terminem.
-- Cron porównuje due_at - reminder_offset_minutes z teraz; jeden push na zadanie bez zmian.
ALTER TABLE tasks ADD COLUMN reminder_offset_minutes INTEGER NOT NULL DEFAULT 0;
