const { client } = require("@nekiro/kick-api");
const express = require("express");
const fs = require("fs");
const path = require("path");

const TOKEN_PATH = path.join(__dirname, "..", "token.json");

function createKickClient() {
  return new client({
    clientId: process.env.KICK_CLIENT_ID,
    clientSecret: process.env.KICK_CLIENT_SECRET,
    redirectUri: process.env.KICK_REDIRECT_URI,
  });
}

// Bot mesajlari icin client credentials flow (redirectUri yok)
function createBotClient() {
  return new client({
    clientId: process.env.KICK_CLIENT_ID,
    clientSecret: process.env.KICK_CLIENT_SECRET,
  });
}

function loadToken() {
  if (fs.existsSync(TOKEN_PATH)) {
    return JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));
  }
  return null;
}

function saveToken(token) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
}

async function authenticate(kickClient) {
  const savedToken = loadToken();

  if (savedToken) {
    kickClient.setToken(savedToken);
    console.log("[Auth] Kayitli token yuklendi.");
    return;
  }

  // Yeni token al - OAuth 2.1 PKCE flow
  return new Promise((resolve, reject) => {
    const app = express();
    const pkce = kickClient.generatePKCEParams();

    const authUrl = kickClient.getAuthorizationUrl(pkce, [
      "user:read",
      "chat:write",
      "chat:read",
      "channel:read",
      "moderation:ban",
      "events:subscribe",
    ]);

    app.get("/callback", async (req, res) => {
      const { code } = req.query;

      if (!code) {
        res.send("Hata: code bulunamadi!");
        return reject(new Error("Authorization code bulunamadi"));
      }

      try {
        const token = await kickClient.exchangeCodeForToken({
          code,
          codeVerifier: pkce.codeVerifier,
        });

        saveToken(token);
        res.send("Basarili! Token alindi. Bu sekmeyi kapatabilirsin.");
        console.log("[Auth] Token alindi ve kaydedildi.");
        server.close();
        resolve();
      } catch (err) {
        res.send("Token alma hatasi: " + err.message);
        server.close();
        reject(err);
      }
    });

    const server = app.listen(3000, () => {
      console.log("[Auth] Tarayici aciliyor, Kick'e giris yap...");
      console.log("[Auth] URL: " + authUrl);
      import("open").then((m) => m.default(authUrl));
    });
  });
}

module.exports = { createKickClient, createBotClient, authenticate, loadToken, saveToken };
