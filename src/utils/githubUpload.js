const fs = require("fs");
const path = require("path");

const GITHUB_API = "https://api.github.com";
const FILE_PATH = "leaderboard.png";

async function uploadToGitHub(imagePath) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    console.error("[GitHub] GITHUB_TOKEN veya GITHUB_REPO tanimli degil!");
    return null;
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const base64Content = imageBuffer.toString("base64");

  // Mevcut dosyanın SHA'sını al (güncelleme için gerekli)
  let sha = null;
  try {
    const res = await fetch(`${GITHUB_API}/repos/${repo}/contents/${FILE_PATH}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      sha = data.sha;
    }
  } catch (err) {
    // Dosya henuz yok, sorun degil
  }

  // Dosyayı yükle/güncelle
  const body = {
    message: "Leaderboard guncellendi",
    content: base64Content,
  };
  if (sha) body.sha = sha;

  try {
    const res = await fetch(`${GITHUB_API}/repos/${repo}/contents/${FILE_PATH}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[GitHub] Yukleme hatasi:", err);
      return null;
    }

    const data = await res.json();
    const rawUrl = `https://raw.githubusercontent.com/${repo}/main/${FILE_PATH}`;
    console.log(`[GitHub] Leaderboard yuklendi: ${rawUrl}`);
    return rawUrl;
  } catch (err) {
    console.error("[GitHub] Yukleme hatasi:", err.message);
    return null;
  }
}

module.exports = { uploadToGitHub };
