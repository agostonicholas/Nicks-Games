const API_BASE = "https://nicks-games-backend.onrender.com";

function getSiteBasePath() {
  const segments = window.location.pathname.split("/").filter(Boolean);

  if (window.location.hostname.endsWith("github.io") && segments.length) {
    return `/${segments[0]}`;
  }

  if (segments[0] && segments[0].toLowerCase() === "nicks-games") {
    return `/${segments[0]}`;
  }

  return "";
}

const ASSET_BASE = getSiteBasePath();

function readGameId() {
  const params = new URLSearchParams(window.location.search);
  const rawId = params.get("id");
  const id = Number(rawId ?? "1");
  return Number.isInteger(id) ? id : 1;
}

async function loadGameMeta(gameId) {
  const res = await fetch(`${ASSET_BASE}/games.json`);
  if (!res.ok) {
    throw new Error(`Failed to load games.json: ${res.status}`);
  }
  const games = await res.json();
  return games.find((game) => game.id === gameId);
}

async function loadLeaderboard(gameId) {
  const res = await fetch(`${API_BASE}/api/leaderboard/${gameId}`);
  if (!res.ok) {
    throw new Error(`Failed to load leaderboard: ${res.status}`);
  }
  return res.json();
}

function renderGameDetails(game) {
  const details = document.querySelector(".game-details");
  if (!details) return;
  details.innerHTML = "";

  if (!game) {
    const fallback = document.createElement("p");
    fallback.textContent = "Game details unavailable.";
    details.appendChild(fallback);
    return;
  }

  const title = document.createElement("h3");
  const desc = document.createElement("p");
  title.textContent = game.name;
  desc.textContent = game.description;
  details.append(title, desc);
}

function renderLeaderboard(top5 = []) {
  const list = document.querySelector(".leaderboard-list");
  const emptyMsg = document.querySelector(".leaderboard-empty");
  if (!list || !emptyMsg) return;

  list.innerHTML = "";

  if (!top5.length) {
    emptyMsg.hidden = false;
    return;
  }

  emptyMsg.hidden = true;

  top5.forEach(({ username, score }) => {
    const item = document.createElement("li");
    item.textContent = `${username} — ${score}`;
    list.appendChild(item);
  });
}

(async function init() {
  const gameId = readGameId();

  try {
    const game = await loadGameMeta(gameId);
    renderGameDetails(game);
  } catch (err) {
    console.error("Failed to load game details:", err);
    renderGameDetails(null);
  }

  try {
    const data = await loadLeaderboard(gameId);
    renderLeaderboard(data.top5 || []);
  } catch (err) {
    console.error("Failed to load leaderboard:", err);
    renderLeaderboard([]);
  }
})();
