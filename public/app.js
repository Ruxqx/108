const state = {
  user: null,
  game: null,
  chat: {
    lastId: 0,
    pollTimer: null
  }
};

const elements = {
  authView: document.querySelector("#authView"),
  gameView: document.querySelector("#gameView"),
  dataView: document.querySelector("#dataView"),
  usernameLabel: document.querySelector("#usernameLabel"),
  chipCount: document.querySelector("#chipCount"),
  logoutButton: document.querySelector("#logoutButton"),
  registerForm: document.querySelector("#registerForm"),
  loginForm: document.querySelector("#loginForm"),
  betForm: document.querySelector("#betForm"),
  betInput: document.querySelector("#betInput"),
  hitButton: document.querySelector("#hitButton"),
  standButton: document.querySelector("#standButton"),
  dealerCards: document.querySelector("#dealerCards"),
  playerCards: document.querySelector("#playerCards"),
  dealerTotal: document.querySelector("#dealerTotal"),
  playerTotal: document.querySelector("#playerTotal"),
  resultBanner: document.querySelector("#resultBanner"),
  handsStat: document.querySelector("#handsStat"),
  winsStat: document.querySelector("#winsStat"),
  lossesStat: document.querySelector("#lossesStat"),
  netStat: document.querySelector("#netStat"),
  historyList: document.querySelector("#historyList"),
  leaderboardList: document.querySelector("#leaderboardList"),
  statsTabButton: document.querySelector("#statsTabButton"),
  guideTabButton: document.querySelector("#guideTabButton"),
  guideModal: document.querySelector("#guideModal"),
  closeGuideButton: document.querySelector("#closeGuideButton"),
  toast: document.querySelector("#toast"),
  chatPanel: document.querySelector("#chatPanel"),
  chatMessages: document.querySelector("#chatMessages"),
  chatForm: document.querySelector("#chatForm"),
  chatInput: document.querySelector("#chatInput"),
  adminPanel: document.querySelector("#adminPanel"),
  adminUserList: document.querySelector("#adminUserList")
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 3200);
}

function updateSession(payload) {
  state.user = payload.user || state.user;
  state.game = payload.game || null;
  render();
}

function render() {
  const loggedIn = Boolean(state.user);
  elements.authView.hidden = loggedIn;
  elements.gameView.hidden = !loggedIn;
  elements.dataView.hidden = !loggedIn;
  elements.logoutButton.hidden = !loggedIn;
  elements.usernameLabel.textContent = loggedIn ? state.user.username : "Guest";
  elements.chipCount.textContent = loggedIn ? state.user.chips : "0";

  // Show/hide chat
  elements.chatPanel.hidden = !loggedIn;
  if (loggedIn) {
    startChatPolling();
  } else {
    stopChatPolling();
  }

  // Show/hide admin panel
  elements.adminPanel.hidden = !(loggedIn && state.user.is_admin);
  if (loggedIn && state.user.is_admin) {
    refreshAdminUsers();
  }

  renderGame();
}

function openGuide() {
  elements.guideModal.hidden = false;
  elements.closeGuideButton.focus();
}

function closeGuide() {
  elements.guideModal.hidden = true;
  elements.guideTabButton.focus();
}

function renderGame() {
  const game = state.game;

  elements.dealerCards.replaceChildren(...renderCards(game?.dealerCards || []));
  elements.playerCards.replaceChildren(...renderCards(game?.playerCards || []));
  elements.dealerTotal.textContent = game?.dealerTotal ?? "?";
  elements.playerTotal.textContent = game?.playerTotal ?? "0";

  const active = game?.status === "playing";
  elements.hitButton.disabled = !active;
  elements.standButton.disabled = !active;
  elements.betForm.querySelector("button").disabled = active;
  elements.betInput.disabled = active;

  if (!game) {
    elements.resultBanner.textContent = "Place a bet to begin.";
    return;
  }

  if (active) {
    elements.resultBanner.textContent = `Bet: ${game.bet} chips. Hit or stand.`;
    return;
  }

  const labels = {
    blackjack: "Blackjack!",
    win: "You win.",
    loss: "Dealer wins.",
    push: "Push."
  };
  const payoutText = game.payout > 0 ? `+${game.payout}` : `${game.payout}`;
  elements.resultBanner.textContent = `${labels[game.result] || "Hand complete"} Payout: ${payoutText} chips.`;
}

function renderCards(cards) {
  return cards.map((card) => {
    const element = document.createElement("div");
    element.className = "card";

    if (card.hidden) {
      element.classList.add("hidden-card");
      element.textContent = "?";
      return element;
    }

    const symbol = suitSymbol(card.suit);
    if (card.suit === "hearts" || card.suit === "diamonds") {
      element.classList.add("red");
    }

    element.innerHTML = `
      <span>${card.rank}${symbol}</span>
      <span class="card-center">${symbol}</span>
      <span class="card-bottom">${card.rank}${symbol}</span>
    `;
    return element;
  });
}

function suitSymbol(suit) {
  return {
    spades: "♠",
    hearts: "♥",
    diamonds: "♦",
    clubs: "♣"
  }[suit];
}

async function refreshStats() {
  if (!state.user) {
    return;
  }

  const { history, stats, leaderboard } = await api("/api/stats");
  elements.handsStat.textContent = stats.hands || 0;
  elements.winsStat.textContent = stats.wins || 0;
  elements.lossesStat.textContent = stats.losses || 0;
  elements.netStat.textContent = stats.net || 0;
  elements.netStat.className = Number(stats.net) >= 0 ? "positive" : "negative";

  elements.historyList.replaceChildren(
    ...(history.length ? history.map(renderHistoryItem) : [emptyRow("No completed hands yet.")])
  );
  elements.leaderboardList.replaceChildren(...leaderboard.map(renderLeaderboardItem));
}

function renderHistoryItem(hand) {
  const item = document.createElement("div");
  item.className = "history-item";
  const payoutClass = hand.payout >= 0 ? "positive" : "negative";
  item.innerHTML = `
    <span>${hand.result} · ${hand.player_total} vs ${hand.dealer_total}</span>
    <strong class="${payoutClass}">${hand.payout >= 0 ? "+" : ""}${hand.payout}</strong>
  `;
  return item;
}

function renderLeaderboardItem(player, index) {
  const item = document.createElement("div");
  item.className = "leaderboard-item";
  item.innerHTML = `
    <span>${index + 1}. ${player.username}</span>
    <strong>${player.chips}</strong>
  `;
  return item;
}

function emptyRow(message) {
  const item = document.createElement("div");
  item.className = "history-item";
  item.textContent = message;
  return item;
}

// ── Chat ──────────────────────────────────────────────

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function appendChatMessage(msg) {
  const isSelf = state.user && msg.userId === state.user.id;

  // Remove empty placeholder if present
  const empty = elements.chatMessages.querySelector(".chat-empty");
  if (empty) empty.remove();

  const wrapper = document.createElement("div");
  wrapper.className = "chat-msg" + (isSelf ? " is-self" : "");

  const meta = document.createElement("div");
  meta.className = "chat-msg-meta";

  const userSpan = document.createElement("span");
  userSpan.className = "chat-msg-user" + (isSelf ? " is-self" : "");
  userSpan.textContent = msg.username;

  const timeSpan = document.createElement("span");
  timeSpan.className = "chat-msg-time";
  timeSpan.textContent = formatTime(msg.createdAt);

  meta.appendChild(userSpan);
  meta.appendChild(timeSpan);

  const text = document.createElement("div");
  text.className = "chat-msg-text";
  text.textContent = msg.text;

  wrapper.appendChild(meta);
  wrapper.appendChild(text);
  elements.chatMessages.appendChild(wrapper);

  // Auto-scroll to bottom
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

function showChatEmpty() {
  if (!elements.chatMessages.querySelector(".chat-msg")) {
    const el = document.createElement("p");
    el.className = "chat-empty";
    el.textContent = "No messages yet. Say hi!";
    elements.chatMessages.appendChild(el);
  }
}

async function pollChat() {
  if (!state.user) return;
  try {
    const { messages } = await api(`/api/chat?after=${state.chat.lastId}`);
    if (messages && messages.length) {
      messages.forEach((msg) => {
        appendChatMessage(msg);
        if (msg.id > state.chat.lastId) state.chat.lastId = msg.id;
      });
    }
  } catch {
    // silently ignore poll errors
  }
}

function startChatPolling() {
  if (state.chat.pollTimer) return; // already running

  // Fetch full history first (after=0)
  state.chat.lastId = 0;
  elements.chatMessages.replaceChildren();
  pollChat().then(() => {
    showChatEmpty();
  });

  state.chat.pollTimer = setInterval(pollChat, 3000);
}

function stopChatPolling() {
  clearInterval(state.chat.pollTimer);
  state.chat.pollTimer = null;
  state.chat.lastId = 0;
  elements.chatMessages.replaceChildren();
}

elements.chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = elements.chatInput.value.trim();
  if (!text) return;

  elements.chatInput.value = "";

  try {
    const { message } = await api("/api/chat", {
      method: "POST",
      body: JSON.stringify({ text })
    });
    // Optimistically add and track id
    appendChatMessage(message);
    if (message.id > state.chat.lastId) state.chat.lastId = message.id;
  } catch (error) {
    showToast(error.message);
  }
});

// ── Auth ──────────────────────────────────────────────

async function submitAuth(form, path) {
  const payload = Object.fromEntries(new FormData(form));
  const data = await api(path, {
    method: "POST",
    body: JSON.stringify(payload)
  });

  updateSession({ user: data.user, game: null });
  form.reset();
  await refreshStats();
}

elements.registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    await submitAuth(event.currentTarget, "/api/auth/register");
  } catch (error) {
    showToast(error.message);
  }
});

elements.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    await submitAuth(event.currentTarget, "/api/auth/login");
  } catch (error) {
    showToast(error.message);
  }
});

elements.logoutButton.addEventListener("click", async () => {
  await api("/api/auth/logout", { method: "POST" });
  state.user = null;
  state.game = null;
  elements.guideModal.hidden = true;
  stopChatPolling();
  render();
});

elements.statsTabButton.addEventListener("click", () => {
  elements.statsTabButton.focus();
});

elements.guideTabButton.addEventListener("click", () => {
  openGuide();
});

elements.closeGuideButton.addEventListener("click", () => {
  closeGuide();
});

elements.guideModal.addEventListener("click", (event) => {
  if (event.target === elements.guideModal) {
    closeGuide();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !elements.guideModal.hidden) {
    closeGuide();
  }
});

elements.betForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const data = await api("/api/games", {
      method: "POST",
      body: JSON.stringify({ bet: elements.betInput.value })
    });
    updateSession(data);
    await refreshStats();
  } catch (error) {
    showToast(error.message);
  }
});

elements.hitButton.addEventListener("click", async () => {
  try {
    const data = await api("/api/games/hit", { method: "POST" });
    updateSession(data);
    await refreshStats();
  } catch (error) {
    showToast(error.message);
  }
});

elements.standButton.addEventListener("click", async () => {
  try {
    const data = await api("/api/games/stand", { method: "POST" });
    updateSession(data);
    await refreshStats();
  } catch (error) {
    showToast(error.message);
  }
});

// ── Admin ─────────────────────────────────────────────

async function refreshAdminUsers() {
  try {
    const { users } = await api("/api/admin/users");
    elements.adminUserList.replaceChildren(...users.map(renderAdminUserRow));
  } catch {
    // not admin or error — just hide
    elements.adminPanel.hidden = true;
  }
}

function renderAdminUserRow(user) {
  const isSelf = state.user && user.id === state.user.id;

  const row = document.createElement("div");
  row.className = "admin-user-row";

  const info = document.createElement("div");
  info.className = "admin-user-info";

  const name = document.createElement("span");
  name.className = "admin-user-name";
  name.textContent = user.username;

  const chips = document.createElement("span");
  chips.className = "admin-user-chips";
  chips.textContent = `${user.chips} chips`;

  info.appendChild(name);
  info.appendChild(chips);

  if (isSelf) {
    const selfTag = document.createElement("span");
    selfTag.className = "admin-user-self";
    selfTag.textContent = "You";
    info.appendChild(selfTag);
  } else if (user.is_admin) {
    const adminTag = document.createElement("span");
    adminTag.className = "admin-user-admin-tag";
    adminTag.textContent = "Admin";
    info.appendChild(adminTag);
  }

  row.appendChild(info);

  // No delete button for self or other admins
  if (!isSelf && !user.is_admin) {
    const btn = document.createElement("button");
    btn.className = "delete-btn";
    btn.textContent = "Delete";
    btn.addEventListener("click", () => deleteUser(user.id, user.username));
    row.appendChild(btn);
  }

  return row;
}

async function deleteUser(userId, username) {
  if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;

  try {
    await api(`/api/admin/users/${userId}`, { method: "DELETE" });
    showToast(`${username} has been deleted.`);
    await refreshAdminUsers();
    await refreshStats(); // refresh leaderboard too
  } catch (error) {
    showToast(error.message);
  }
}

api("/api/me")
  .then(async (data) => {
    updateSession(data);
    await refreshStats();
  })
  .catch(() => {
    render();
  });
