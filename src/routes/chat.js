const express = require("express");

const router = express.Router();

const MAX_MESSAGES = 100;
const messages = [];
let nextId = 1;

function requireAuth(request, response, next) {
  if (!request.session.userId) {
    response.status(401).json({ error: "Please log in first." });
    return;
  }
  next();
}

router.use(requireAuth);

router.get("/", (request, response) => {
  const after = Number(request.query.after) || 0;
  const filtered = messages.filter((m) => m.id > after);
  response.json({ messages: filtered });
});

//send message
router.post("/", (request, response) => {
  const text = (request.body.text || "").trim().slice(0, 280);

  if (!text) {
    response.status(400).json({ error: "Message cannot be empty." });
    return;
  }

  const message = {
    id: nextId++,
    userId: request.session.userId,
    username: request.session.username,
    text,
    createdAt: new Date().toISOString()
  };

  messages.push(message);

  if (messages.length > MAX_MESSAGES) {
    messages.splice(0, messages.length - MAX_MESSAGES);
  }

  response.status(201).json({ message });
});

module.exports = router;
