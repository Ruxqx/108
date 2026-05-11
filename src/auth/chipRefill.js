const { get, run } = require("../db/database");
const { getLoggedInUserIds } = require("./loggedInUsers");

const CHIP_REFILL_AMOUNT = 200;

async function refillLoggedInUsersIfNeeded(userId) {
  const user = await get("SELECT chips FROM users WHERE id = $1", [userId]);

  if (!user || user.chips > 0) {
    return false;
  }

  const loggedInUserIds = getLoggedInUserIds();

  if (!loggedInUserIds.length) {
    return false;
  }

  // Postgres uses $1, $2, $3... — $1 is the amount, $2+ are the user ids
  const placeholders = loggedInUserIds.map((_, i) => `$${i + 2}`).join(", ");
  await run(
    `UPDATE users SET chips = chips + $1 WHERE id IN (${placeholders})`,
    [CHIP_REFILL_AMOUNT, ...loggedInUserIds]
  );

  return true;
}

module.exports = {
  CHIP_REFILL_AMOUNT,
  refillLoggedInUsersIfNeeded
};
