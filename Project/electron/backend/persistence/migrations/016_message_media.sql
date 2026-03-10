CREATE TABLE message_media (
    media_id TEXT PRIMARY KEY,
    message_part_id TEXT NOT NULL UNIQUE REFERENCES message_parts(id) ON DELETE CASCADE,
    mime_type TEXT NOT NULL,
    width INTEGER NOT NULL CHECK (width > 0),
    height INTEGER NOT NULL CHECK (height > 0),
    byte_size INTEGER NOT NULL CHECK (byte_size >= 0),
    sha256 TEXT NOT NULL,
    bytes_blob BLOB NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX idx_message_media_part_id ON message_media(message_part_id);
