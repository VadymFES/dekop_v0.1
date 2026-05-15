-- Kitchen carousel cards
CREATE TABLE IF NOT EXISTS kitchen_cards (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(200) NOT NULL,
  description  TEXT         NOT NULL DEFAULT '',
  price        INTEGER      NOT NULL DEFAULT 0,
  image_url    TEXT         NOT NULL DEFAULT '',
  sort_order   INTEGER      NOT NULL DEFAULT 0,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Kitchen gallery images
CREATE TABLE IF NOT EXISTS kitchen_gallery (
  id          SERIAL PRIMARY KEY,
  image_url   TEXT    NOT NULL,
  alt         TEXT    NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
