CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT        NOT NULL,
  count        INTEGER     NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (key)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits (window_start);
