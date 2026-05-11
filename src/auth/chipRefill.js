const { get, run } = require("../db/database");
const { getLoggedInUserIds } = require("./loggedInUsers");

const CHIP_REFILL_AMOUNT = 200;

async function refillLoggedInUsersIfNeeded(userId) {
  const user = await get("SELECT chips FROM users WHERE id = ?", [userId]);

  if (!user || user.chips > 0) {
    return false;
  }

  const loggedInUserIds = getLoggedInUserIds();

  if (!loggedInUserIds.length) {
    return false;
  }

  const placeholders = loggedInUserIds.map(() => "?").join(", ");
  await run(`UPDATE users SET chips = chips + ? WHERE id IN (${placeholders})`, [
    CHIP_REFILL_AMOUNT,
    ...loggedInUserIds
  ]);

  return true;
}

module.exports = {
  CHIP_REFILL_AMOUNT,
  refillLoggedInUsersIfNeeded
};
