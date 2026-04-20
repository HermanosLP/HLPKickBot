require("dotenv").config();
const express = require("express");

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;
const SCOPES = "user-read-currently-playing user-read-playback-state user-modify-playback-state";

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
  console.error("HATA: .env icinde SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI olmali.");
  process.exit(1);
}

const authUrl =
  "https://accounts.spotify.com/authorize?" +
  new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
  }).toString();

const app = express();

app.get("/spotify/callback", async (req, res) => {
  const code = req.query.code;
  const error = req.query.error;

  if (error) {
    res.status(400).send("Spotify hatasi: " + error);
    console.error("[SpotifyAuth] Spotify hata dondu:", error);
    return;
  }
  if (!code) {
    res.status(400).send("Code bulunamadi");
    return;
  }

  try {
    const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
    const r = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const data = await r.json();

    if (!r.ok) {
      console.error("[SpotifyAuth] Token hatasi:", data);
      res.status(500).send("Token alinamadi: " + JSON.stringify(data));
      return;
    }

    console.log("\n==================== REFRESH TOKEN ====================");
    console.log(data.refresh_token);
    console.log("=======================================================");
    console.log("\nBu degeri .env dosyandaki SPOTIFY_REFRESH_TOKEN=... satirina yapistir.");
    console.log("Sonra bu script'i CTRL+C ile kapat.\n");

    res.send("Tamamdir! Refresh token terminalde yazildi. Bu pencereyi kapatabilirsin.");
  } catch (err) {
    console.error("[SpotifyAuth] Hata:", err);
    res.status(500).send("Hata: " + err.message);
  }
});

app.listen(3000, "127.0.0.1", () => {
  console.log("\n[SpotifyAuth] Callback server 127.0.0.1:3000 dinleniyor.");
  console.log("\n1) Asagidaki URL'i tarayicida ac:\n");
  console.log(authUrl);
  console.log("\n2) Spotify hesabinla onay ver. Tarayici callback'e donecek.");
  console.log("3) Terminalde refresh_token gorunecek, .env'e yapistir, sonra CTRL+C.\n");
});
