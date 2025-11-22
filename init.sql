CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE memory (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    response TEXT NOT NULL,
    embedding VECTOR(768),
    hidden BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP DEFAULT NULL
);

CREATE INDEX memory_embedding_idx
ON memory
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

ANALYZE memory;