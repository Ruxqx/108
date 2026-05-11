const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

// Run an INSERT/UPDATE/DELETE — returns { id, changes }
async function run(sql, params = []) {
  const result = await pool.query(sql, params);
  return {
    id: result.rows[0]?.id ?? null,
    changes: result.rowCount
  };
}

// Fetch a single row
async function get(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows[0] ?? null;
}

// Fetch multiple rows
async function all(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

module.exports = {
  pool,
  run,
  get,
  all
};
