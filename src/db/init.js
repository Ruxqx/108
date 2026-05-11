require("dotenv").config();

const { run } = require("./database");

async function initDatabase() {
  await run("PRAGMA foreign_keys = ON");

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      chips INTEGER NOT NULL DEFAULT 1000,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      bet INTEGER NOT NULL,
      result TEXT NOT NULL,
      payout INTEGER NOT NULL,
      player_total INTEGER NOT NULL,
      dealer_total INTEGER NOT NULL,
      player_cards TEXT NOT NULL,
      dealer_cards TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
