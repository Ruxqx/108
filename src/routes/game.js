const express = require("express");
const { all, get, run } = require("../db/database");
const { refillLoggedInUsersIfNeeded } = require("../auth/chipRefill");
const { handValue, hit, publicGame, stand, startGame } = require("../game/blackjack");

const router = express.Router();

function requireAuth(request, response, next) {
  if (!request.session.userId) {
    response.status(401).json({ error: "Please log in first." });
    return;
  }

  next();
}

function currentGame(request) {
  return request.session.game || null;
}

async function finishGame(request, game) {
  const userId = request.session.userId;
  const playerTotal = handValue(game.player);
  const dealerTotal = handValue(game.dealer);

  await run(
    "UPDATE users SET chips = chips + $1 WHERE id = $2",
    [game.payout, userId]
  );

  await run(
    `INSERT INTO games
       (user_id, bet, result, payout, player_total, dealer_total, player_cards, dealer_cards)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      userId,
      game.bet,
      game.result,
      game.payout,
      playerTotal,
      dealerTotal,
      JSON.stringify(game.player),
      JSON.stringify(game.dealer)
    ]
  );

  request.session.game = null;
}

router.use(requireAuth);

router.get("/me", async (request, response, next) => {
  try {
    await refillLoggedInUsersIfNeeded(request.session.userId);
    const user = await get(
      "SELECT id, username, chips FROM users WHERE id = $1",
      [request.session.userId]
    );
    response.json({ user, game: publicGame(currentGame(request)) });
  } catch (error) {
    next(error);
  }
});

router.post("/games", async (request, response, next) => {
  try {
    const bet = Number(request.body.bet);
    await refillLoggedInUsersIfNeeded(request.session.userId);
    const user = await get(
      "SELECT chips FROM users WHERE id = $1",
      [request.session.userId]
    );

    if (!Number.isSafeInteger(bet) || bet < 1) {
      response.status(400).json({ error: "Bet must be a whole number of chips." });
      return;
    }

    if (!user || user.chips < bet) {
      response.status(400).json({ error: "You do not have enough chips for that bet." });
      return;
    }

    const game = startGame(bet);
    request.session.game = game;

    if (game.status === "complete") {
      await finishGame(request, game);
    }

    await refillLoggedInUsersIfNeeded(request.session.userId);

    const refreshedUser = await get(
      "SELECT id, username, chips FROM users WHERE id = $1",
      [request.session.userId]
    );
    response.status(201).json({ user: refreshedUser, game: publicGame(game) });
  } catch (error) {
    next(error);
  }
});

router.post("/games/hit", async (request, response, next) => {
  try {
    const game = hit(currentGame(request));
    request.session.game = game;

    if (game.status === "complete") {
      await finishGame(request, game);
    }

    await refillLoggedInUsersIfNeeded(request.session.userId);
    const user = await get(
      "SELECT id, username, chips FROM users WHERE id = $1",
      [request.session.userId]
    );
    response.json({ user, game: publicGame(game) });
  } catch (error) {
    next(error);
  }
});

router.post("/games/stand", async (request, response, next) => {
  try {
    const game = stand(currentGame(request));
    request.session.game = game;

    if (game.status === "complete") {
      await finishGame(request, game);
    }

    await refillLoggedInUsersIfNeeded(request.session.userId);
    const user = await get(
      "SELECT id, username, chips FROM users WHERE id = $1",
      [request.session.userId]
    );
    response.json({ user, game: publicGame(game, true) });
  } catch (error) {
    next(error);
  }
});

router.get("/stats", async (request, response, next) => {
  try {
    await refillLoggedInUsersIfNeeded(request.session.userId);

    const history = await all(
      `SELECT id, bet, result, payout, player_total, dealer_total, created_at
       FROM games
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 12`,
      [request.session.userId]
    );

    const stats = await get(
      `SELECT
         COUNT(*) AS hands,
         SUM(CASE WHEN result IN ('win', 'blackjack') THEN 1 ELSE 0 END) AS wins,
         SUM(CASE WHEN result = 'loss' THEN 1 ELSE 0 END) AS losses,
         SUM(CASE WHEN result = 'push' THEN 1 ELSE 0 END) AS pushes,
         COALESCE(SUM(payout), 0) AS net
       FROM games
       WHERE user_id = $1`,
      [request.session.userId]
    );

    const leaderboard = await all(
      `SELECT username, chips
       FROM users
       ORDER BY chips DESC, username ASC
       LIMIT 10`
    );

    response.json({ history, stats, leaderboard });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
