# Blackjack Full-Stack Web App

A substantial blackjack-style web application with:

- Express server
- SQLite database
- Browser frontend
- Register/login/logout
- Salted password hashing with `bcryptjs`
- Server-side blackjack game state
- Persistent game history, stats, and leaderboard
- Deployment-ready configuration

## Run Locally

```bash
npm.cmd install
copy .env.example .env
npm.cmd run db:init
npm.cmd run dev
```

Then open `http://localhost:3000`.

On macOS/Linux, use `npm` instead of `npm.cmd`.

## Hosting Live

This app is ready for services like Render, Railway, Fly.io, or a VPS.

For Render:

1. Push this project to GitHub.
2. Create a new Web Service from the repository.
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variables:
   - `NODE_ENV=production`
   - `SESSION_SECRET=<long random secret>`
   - `DATABASE_PATH=/opt/render/project/src/data/blackjack.sqlite`
6. Add a persistent disk mounted at `/opt/render/project/src/data` so the SQLite database survives deploys.

## Security Notes

Passwords are never stored directly. The server stores only a salted bcrypt hash in the `users.password_hash` column.

The browser does not decide wins or balances. Game actions are sent to the server, where card draws, hand values, dealer behavior, and database updates happen.
