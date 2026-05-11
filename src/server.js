require("dotenv").config();

const path = require("path");
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const { initDatabase } = require("./db/init");
const authRoutes = require("./routes/auth");
const gameRoutes = require("./routes/game");
const chatRoutes = require("./routes/chat");

const app = express();
const port = process.env.PORT || 3000;

app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "script-src": ["'self'"],
        "style-src": ["'self'", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "https://fonts.gstatic.com"]
      }
    }
  })
);
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "development-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

app.use(express.static(path.join(__dirname, "..", "public")));
app.use("/api/auth", authRoutes);
app.use("/api", gameRoutes);
app.use("/api/chat", chatRoutes);

app.use((request, response) => {
  response.status(404).json({ error: "Not found." });
});

app.use((error, request, response, next) => {
  const status = error.message.includes("active hand") ? 400 : 500;
  response.status(status).json({ error: status === 500 ? "Something went wrong." : error.message });
});

initDatabase().then(() => {
  app.listen(port, () => {
    console.log(`Blackjack app running on http://localhost:${port}`);
  });
});
