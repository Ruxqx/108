const express = require("express");
const bcrypt = require("bcryptjs");
const { get, run } = require("../db/database");
const { refillLoggedInUsersIfNeeded } = require("../auth/chipRefill");
const { addLoggedInUser, removeLoggedInUser } = require("../auth/loggedInUsers");

const router = express.Router();
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

router.post("/register", async (request, response, next) => {
  try {
    const { username, password } = request.body;

    if (!USERNAME_PATTERN.test(username || "")) {
      response.status(400).json({ error: "Username must be 3-20 letters, numbers, or underscores." });
      return;
    }

    if (!password || password.length < 8) {
      response.status(400).json({ error: "Password must be at least 8 characters." });
      return;
    }

    const existingUser = await get("SELECT id FROM users WHERE lower(username) = lower($1)", [username]);

    if (existingUser) {
      response.status(409).json({ error: "That username is already taken." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await run(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id",
      [username, passwordHash]
    );

    if (request.session.userId && request.session.userId !== result.id) {
      removeLoggedInUser(request.session.userId);
    }

    request.session.userId = result.id;
    request.session.username = username;
    addLoggedInUser(result.id);
    response.status(201).json({ user: { id: result.id, username, chips: 1000 } });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (request, response, next) => {
  try {
    const { username, password } = request.body;
    const user = await get("SELECT id, username, password_hash, chips FROM users WHERE lower(username) = lower($1)", [
      username || ""
    ]);

    if (!user || !(await bcrypt.compare(password || "", user.password_hash))) {
      response.status(401).json({ error: "Invalid username or password." });
      return;
    }

    if (request.session.userId && request.session.userId !== user.id) {
      removeLoggedInUser(request.session.userId);
    }

    const wasAlreadyLoggedIn = request.session.userId === user.id;
    request.session.userId = user.id;
    request.session.username = user.username;
    if (!wasAlreadyLoggedIn) {
      addLoggedInUser(user.id);
    }
    await refillLoggedInUsersIfNeeded(user.id);

    const refreshedUser = await get("SELECT id, username, chips FROM users WHERE id = $1", [user.id]);
    response.json({ user: refreshedUser });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", (request, response, next) => {
  const userId = request.session.userId;

  request.session.destroy((error) => {
    if (error) {
      next(error);
      return;
    }

    removeLoggedInUser(userId);
    response.clearCookie("connect.sid");
    response.json({ ok: true });
  });
});

module.exports = router;
