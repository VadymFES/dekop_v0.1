import { db } from './db';

export async function ensureKitchenTables() {
  await db.query`
    CREATE TABLE IF NOT EXISTS kitchen_cards (
      id          SERIAL PRIMARY KEY,
      name        VARCHAR(200) NOT NULL,
      description TEXT         NOT NULL DEFAULT '',
      price       INTEGER      NOT NULL DEFAULT 0,
      image_url   TEXT         NOT NULL DEFAULT '',
      sort_order  INTEGER      NOT NULL DEFAULT 0,
      created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
  await db.query`
    CREATE TABLE IF NOT EXISTS kitchen_gallery (
      id          SERIAL PRIMARY KEY,
      image_url   TEXT    NOT NULL,
      alt         TEXT    NOT NULL DEFAULT '',
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
  await db.query`
    CREATE TABLE IF NOT EXISTS kitchen_orders (
      id          SERIAL PRIMARY KEY,
      last_name   VARCHAR(100) NOT NULL,
      first_name  VARCHAR(100) NOT NULL,
      patronymic  VARCHAR(100) NOT NULL DEFAULT '',
      phone       VARCHAR(20)  NOT NULL,
      email       VARCHAR(255) NOT NULL,
      region      VARCHAR(100) NOT NULL DEFAULT '',
      city        VARCHAR(100) NOT NULL DEFAULT '',
      corpus      VARCHAR(60)  NOT NULL DEFAULT '',
      worktop     VARCHAR(60)  NOT NULL DEFAULT '',
      fittings    VARCHAR(60)  NOT NULL DEFAULT '',
      colors      TEXT         NOT NULL DEFAULT '',
      appliances  TEXT         NOT NULL DEFAULT '',
      comment     TEXT         NOT NULL DEFAULT '',
      status      VARCHAR(30)  NOT NULL DEFAULT 'new',
      created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
}
