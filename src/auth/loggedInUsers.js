const loggedInUserSessions = new Map();

function addLoggedInUser(userId) {
  if (userId) {
    const normalizedUserId = Number(userId);
    loggedInUserSessions.set(normalizedUserId, (loggedInUserSessions.get(normalizedUserId) || 0) + 1);
  }
}

function removeLoggedInUser(userId) {
  if (userId) {
    const normalizedUserId = Number(userId);
    const sessionCount = loggedInUserSessions.get(normalizedUserId) || 0;

    if (sessionCount <= 1) {
      loggedInUserSessions.delete(normalizedUserId);
      return;
    }

    loggedInUserSessions.set(normalizedUserId, sessionCount - 1);
  }
}

function getLoggedInUserIds() {
  return Array.from(loggedInUserSessions.keys());
}

module.exports = {
  addLoggedInUser,
  removeLoggedInUser,
  getLoggedInUserIds
};
