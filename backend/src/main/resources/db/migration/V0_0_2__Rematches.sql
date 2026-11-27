ALTER TABLE session_rooms
    ADD COLUMN match_number INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN player_first_ready_for_rematch BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN player_second_ready_for_rematch BOOLEAN NOT NULL DEFAULT FALSE;
