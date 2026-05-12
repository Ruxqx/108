const express = require("express");
const { all, run } = require("../db/database");
const { removeLoggedInUser } = require("../auth/loggedInUsers");

const router = express.Router();

function requireAdmin(request, response, next) {
  if (!request.session.userId) {
    response.status(401).json({ error: "Please log in first." });
    return;
  }

  if (!request.session.isAdmin) {
    response.status(403).json({ error: "Admin access required." });
    return;
  }

  next();
}

router.use(requireAdmin);

// GET /api/admin/users — list all users
router.get("/users", async (request, response, next) => {
  try {
    const users = await all(
      `SELECT id, username, chips, is_admin, created_at
       FROM users
       ORDER BY chips DESC, username ASC`
    );
    response.json({ users });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/users/:id — delete a user
router.delete("/users/:id", async (request, response, next) => {
  try {
    const targetId = Number(request.params.id);

    if (targetId === request.session.userId) {
      response.status(400).json({ error: "You cannot delete your own account." });
      return;
    }

    const result = await run(
      "DELETE FROM users WHERE id = $1 AND is_admin = false RETURNING id",
      [targetId]
    );

    if (!result.changes) {
      response.status(404).json({ error: "User not found or is an admin." });
      return;
    }

    // Boot them if they're logged in
    removeLoggedInUser(targetId);
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
