CREATE TABLE IF NOT EXISTS movies (
  id bigint PRIMARY KEY, title text NOT NULL, title_th text, genre text,
  year integer, rating numeric(4,1), detail text, poster text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS members (
  id bigserial PRIMARY KEY, email text NOT NULL UNIQUE, password_hash text NOT NULL,
  display_name text NOT NULL, role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
  token text PRIMARY KEY, member_id bigint NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);
CREATE TABLE IF NOT EXISTS reviews (
  id bigserial PRIMARY KEY, member_id bigint NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  movie_id bigint NOT NULL REFERENCES movies(id) ON DELETE CASCADE, text text NOT NULL CHECK (char_length(text) >= 10),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, movie_id)
);
CREATE TABLE IF NOT EXISTS votes (
  member_id bigint NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  movie_id bigint NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  score smallint NOT NULL CHECK (score BETWEEN 1 AND 10),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (member_id, movie_id)
);
CREATE TABLE IF NOT EXISTS wishlist_items (
  member_id bigint NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  movie_id bigint NOT NULL REFERENCES movies(id) ON DELETE CASCADE, note text,
  added_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (member_id, movie_id)
);
CREATE INDEX IF NOT EXISTS reviews_movie_id_idx ON reviews (movie_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at);
