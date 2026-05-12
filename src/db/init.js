require("dotenv").config();

const { pool } = require("./database");

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id          SERIAL PRIMARY KEY,
      username    TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      chips       INTEGER NOT NULL DEFAULT 1000,
      is_admin    BOOLEAN NOT NULL DEFAULT false,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS games (
      id            SERIAL PRIMARY KEY,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      bet           INTEGER NOT NULL,
      result        TEXT NOT NULL,
      payout        INTEGER NOT NULL,
      player_total  INTEGER NOT NULL,
      dealer_total  INTEGER NOT NULL,
      player_cards  TEXT NOT NULL,
      dealer_cards  TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log("Database is ready.");
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  initDatabase
};
