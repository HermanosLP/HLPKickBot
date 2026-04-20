const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "..", "config", "moderation.json");

let config = loadConfig();

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
}

function reloadConfig() {
  config = loadConfig();
  return config;
}

// STRICT TLD'ler: cümle kelimesiyle karışma riski düşük, her formatta yakala
const STRICT_TLDS = [
  "com", "net", "org", "xyz", "info", "biz", "online", "site", "store",
  "club", "link", "shop", "pro", "app", "stream", "cc", "live", "fun",
  "top", "vip", "bet", "win", "lol", "ws",
  "ru", "uk", "fr", "es", "it", "nl", "br", "jp", "kr", "cn", "ca",
  "au", "cz", "pl", "se",
];

// LOOSE TLD'ler: kısa/yaygın kelimelerle karışabilir, sadece URL şeması
// (https://, www.) VEYA /path ile birlikte yakala
const LOOSE_TLDS = [
  "co", "me", "de", "ai", "su", "in", "tr", "gg", "tv", "to", "io",
  "eu", "dev",
];

const ALL_TLDS = [...STRICT_TLDS, ...LOOSE_TLDS];
const STRICT_PATTERN = STRICT_TLDS.join("|");
const LOOSE_PATTERN = LOOSE_TLDS.join("|");
const ALL_PATTERN = ALL_TLDS.join("|");

// Obfuscation temizligi - SADECE strict TLD'ler hedef alinir, loose'lar
// cumle icinde false positive uretir
function normalize(text) {
  let t = text
    .replace(/[\u200B-\u200D\uFEFF\u2060]/g, "")
    .toLowerCase();

  // (.) [.] {.} -> .
  t = t.replace(/\s*[\(\[\{]\s*\.\s*[\)\]\}]\s*/g, ".");
  // " dot " / " nokta " / " nk " -> .
  t = t.replace(/\s+(dot|nokta|nk|nokt)\s+/gi, ".");

  // "word . TLD" nokta etrafi boslugu - SADECE strict TLD'ler icin
  const spacedDotTld = new RegExp(
    `([a-z0-9][a-z0-9-]{0,62})\\s*\\.\\s*(${STRICT_PATTERN})\\b`,
    "gi"
  );
  t = t.replace(spacedDotTld, "$1.$2");

  // "word TLD/path" nokta yerine bosluk, slash var - strict + loose ikisine de
  const spacedTldSlash = new RegExp(
    `\\b([a-z0-9][a-z0-9-]{1,62})\\s+(${ALL_PATTERN})(\\/)`,
    "gi"
  );
  t = t.replace(spacedTldSlash, "$1.$2$3");

  return t;
}

// STRICT TLD'ler: herhangi bir formatta
const STRICT_URL_REGEX = new RegExp(
  `\\b((?:https?:\\/\\/)?(?:[a-z0-9][a-z0-9-]{0,62}\\.)+(?:${STRICT_PATTERN})(?:\\/[^\\s]*)?)\\b`,
  "gi"
);

// LOOSE TLD'ler: sadece https://, www. prefix VEYA /path suffix ile
const LOOSE_URL_REGEX = new RegExp(
  `\\b(` +
    // https:// veya www. ile baslayan
    `(?:https?:\\/\\/|www\\.)(?:[a-z0-9][a-z0-9-]{0,62}\\.)+(?:${LOOSE_PATTERN})(?:\\/[^\\s]*)?` +
    `|` +
    // /path ile biten (prefix olmasa da)
    `(?:[a-z0-9][a-z0-9-]{0,62}\\.)+(?:${LOOSE_PATTERN})\\/[^\\s]*` +
  `)\\b`,
  "gi"
);

function findLinks(text) {
  const normalized = normalize(text);
  const matches = [
    ...(normalized.match(STRICT_URL_REGEX) || []),
    ...(normalized.match(LOOSE_URL_REGEX) || []),
  ];

  return matches.map((raw) => {
    const cleaned = raw.replace(/^https?:\/\//, "").replace(/^www\./, "");
    const domain = cleaned.split("/")[0].split("?")[0];
    return { raw, domain };
  });
}

function isWhitelisted(domain) {
  return config.linkGuard.whitelist.some(
    (w) => domain === w || domain.endsWith("." + w)
  );
}

function hasBypassBadge(badges) {
  if (!Array.isArray(badges)) return false;
  const bypass = config.linkGuard.bypassBadges;
  return badges.some((b) => bypass.includes(b?.type));
}

function checkMessage(msg) {
  if (!config.linkGuard.enabled) return null;
  if (hasBypassBadge(msg.badges)) return null;

  const links = findLinks(msg.content || "");
  if (!links.length) return null;

  // Aynı domaini birden fazla yakalamış olabiliriz (strict + loose), dedupe
  const uniqueDomains = [...new Set(links.map((l) => l.domain))];
  const offending = uniqueDomains.filter((d) => !isWhitelisted(d));
  if (!offending.length) return null;

  return { offendingDomains: offending };
}

function getPunishment(offenseCount) {
  const steps = config.linkGuard.escalation;
  const idx = Math.min(offenseCount, steps.length - 1);
  return steps[idx];
}

function getResetMs() {
  return (config.linkGuard.resetAfterDays || 30) * 24 * 60 * 60 * 1000;
}

module.exports = { checkMessage, getPunishment, getResetMs, reloadConfig };
