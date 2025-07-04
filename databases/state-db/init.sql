CREATE TABLE IF NOT EXISTS requests (
    request_id UUID PRIMARY KEY,
    user_id INTEGER NOT NULL, 
    status TEXT NOT NULL CHECK (status IN ('pending', 'done', 'error')),
    payload TEXT,
    result JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trips (
    trip_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    destination TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    interests   JSONB    NOT NULL DEFAULT '[]',
    raw_plan JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS history (
    history_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    trip_id INTEGER REFERENCES trips(trip_id),
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
