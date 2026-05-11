import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================
   RICH BIZNESS MOBILE GAMING
   /core/pages/gaming.js
   Realtime Arcade Connector
========================= */

const SUPABASE_URL = "https://zsancpcyhdidrlezggrl.supabase.co";
const SUPABASE_KEY = "sb_publishable_Hahozdb2FpB9cDsoWEEJzQ_WA_xdWV2";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

const $ = (id) => document.getElementById(id);

const els = {
  tabs: document.querySelectorAll("[data-tab]"),

  statGames: $("statGames"),
  statTopScore: $("statTopScore"),
  statPlays: $("statPlays"),
  statChallenges: $("statChallenges"),

  featuredCover: $("featuredCover"),
  featuredTitle: $("featuredTitle"),
  featuredDescription: $("featuredDescription"),
  featuredPlayBtn: $("featuredPlayBtn"),

  scoreGameSelect: $("scoreGameSelect"),
  scoreInput: $("scoreInput"),
  modeInput: $("modeInput"),
  resultInput: $("resultInput"),
  submitScoreBtn: $("submitScoreBtn"),

  gamingStatus: $("gamingStatus"),
  sectionTitle: $("sectionTitle"),
  sectionCount: $("sectionCount"),
  gamingList: $("gamingList")
};

let currentUser = null;
let currentProfile = null;

let activeTab = "games";
let games = [];
let scores = [];
let sessions = [];
let clips = [];
let challenges = [];
let likedGameIds = new Set();

let featuredGame = null;
let realtimeChannel = null;

function setStatus(message) {
  if (els.gamingStatus) els.gamingStatus.textContent = message || "";
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function number(value = 0) {
  return Number(value || 0).toLocaleString();
}

function getUsername(profile, user) {
  return (
    profile?.username ||
    user?.email?.split("@")[0] ||
    "player"
  );
}

function coverHtml(url, fallback = "🎮") {
  if (!url) return escapeHtml(fallback);
  return `<img src="${escapeHtml(url)}" alt="" />`;
}

function formatDate(value) {
  if (!value) return "JUST NOW";

  const date = new Date(value);
  const diff = Date.now() - date.getTime();

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "JUST NOW";
  if (diff < hour) return `${Math.floor(diff / minute)}M AGO`;
  if (diff < day) return `${Math.floor(diff / hour)}H AGO`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  }).toUpperCase();
}

/* =========================
   AUTH + PROFILE
========================= */
async function loadUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.warn("Gaming auth error:", error);
  }

  currentUser = data?.user || null;

  if (!currentUser) {
    els.submitScoreBtn.disabled = true;
    setStatus("SIGN IN REQUIRED TO SUBMIT SCORES");
    return;
  }

  els.submitScoreBtn.disabled = false;
  await loadProfile();
}

async function loadProfile() {
  if (!currentUser) return;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, created_at")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.warn("Gaming profile load error:", error);
  }

  currentProfile = data || null;
}

/* =========================
   LOAD DATA
========================= */
async function loadLikedGames() {
  likedGameIds = new Set();

  if (!currentUser) return;

  const { data, error } = await supabase
    .from("game_likes")
    .select("game_id")
    .eq("user_id", currentUser.id);

  if (error) {
    console.warn("Game likes load error:", error);
    return;
  }

  likedGameIds = new Set((data || []).map((row) => row.game_id));
}

async function loadGames() {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Games load error:", error);
    setStatus(`GAMES ERROR: ${error.message}`);
    return;
  }

  games = data || [];
  featuredGame = games.find((game) => game.is_featured) || games[0] || null;
}

async function loadScores() {
  const { data, error } = await supabase
    .from("game_scores")
    .select("*")
    .order("score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Scores load error:", error);
    setStatus(`SCORES ERROR: ${error.message}`);
    return;
  }

  scores = data || [];
}

async function loadSessions() {
  const { data, error } = await supabase
    .from("game_sessions")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(40);

  if (error) {
    console.warn("Sessions load error:", error);
    return;
  }

  sessions = data || [];
}

async function loadClips() {
  const { data, error } = await supabase
    .from("game_clips")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    console.warn("Clips load error:", error);
    return;
  }

  clips = data || [];
}

async function loadChallenges() {
  const { data, error } = await supabase
    .from("game_challenges")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    console.warn("Challenges load error:", error);
    return;
  }

  challenges = data || [];
}

async function loadAllGaming() {
  setStatus("LOADING REALTIME ARCADE...");

  await loadLikedGames();
  await loadGames();
  await loadScores();
  await loadSessions();
  await loadClips();
  await loadChallenges();

  renderHeader();
  renderFeatured();
  renderGameSelect();
  renderActiveTab();

  setStatus("GAMING REALTIME CONNECTED");
}

/* =========================
   RENDER
========================= */
function renderHeader() {
  const totalPlays = games.reduce((sum, game) => sum + Number(game.total_plays || 0), 0);
  const topScore = scores[0]?.score || games.reduce((max, game) => Math.max(max, Number(game.high_score || 0)), 0);

  els.statGames.textContent = number(games.length);
  els.statTopScore.textContent = number(topScore);
  els.statPlays.textContent = number(totalPlays);
  els.statChallenges.textContent = number(challenges.length);
}

function renderFeatured() {
  if (!featuredGame) {
    els.featuredTitle.textContent = "No Games Yet";
    els.featuredDescription.textContent = "Add your first Rich Bizness game.";
    els.featuredCover.textContent = "🎮";
    return;
  }

  els.featuredTitle.textContent = featuredGame.title;
  els.featuredDescription.textContent = featuredGame.description || "Rich Bizness arcade game.";
  els.featuredCover.innerHTML = coverHtml(featuredGame.cover_url || featuredGame.logo_url, "🎮");
}

function renderGameSelect() {
  if (!els.scoreGameSelect) return;

  if (!games.length) {
    els.scoreGameSelect.innerHTML = `<option value="">No games yet</option>`;
    return;
  }

  els.scoreGameSelect.innerHTML = games
    .map((game) => {
      return `
        <option value="${escapeHtml(game.slug)}">
          ${escapeHtml(game.title)}
        </option>
      `;
    })
    .join("");
}

function setActiveTab(tab) {
  activeTab = tab;

  els.tabs.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.tab === tab);
  });

  renderActiveTab();
}

function renderActiveTab() {
  if (activeTab === "games") {
    renderGames();
    return;
  }

  if (activeTab === "leaderboard") {
    renderLeaderboard();
    return;
  }

  renderClips();
}

function renderGames() {
  els.sectionTitle.textContent = "GAMES";
  els.sectionCount.textContent = `${games.length} live`;

  if (!games.length) {
    els.gamingList.innerHTML = `
      <div class="empty">
        No games yet. Add the first Rich Bizness game.
      </div>
    `;
    return;
  }

  els.gamingList.innerHTML = games
    .map((game) => {
      const liked = likedGameIds.has(game.id);

      return `
        <article class="game-card">
          <div class="game-row">
            <div class="game-cover">
              ${coverHtml(game.cover_url || game.logo_url, "🎮")}
            </div>

            <div class="game-info">
              <strong>${escapeHtml(game.title)}</strong>
              <small>${escapeHtml(game.category || "ARCADE")} · ${number(game.total_plays)} PLAYS · HIGH ${number(game.high_score)}</small>
              ${game.description ? `<p>${escapeHtml(game.description)}</p>` : ""}
            </div>

            <button
              class="mini-play"
              type="button"
              data-action="play-game"
              data-slug="${escapeHtml(game.slug)}"
            >
              ▶
            </button>
          </div>

          <div class="actions">
            <button
              class="action-btn"
              type="button"
              data-action="play-game"
              data-slug="${escapeHtml(game.slug)}"
            >
              PLAY
            </button>

            <button
              class="action-btn ${liked ? "is-liked" : ""}"
              type="button"
              data-action="like-game"
              data-id="${escapeHtml(game.id)}"
            >
              ${liked ? "💚" : "♡"} LIKE
            </button>

            <button
              class="action-btn"
              type="button"
              data-action="select-score"
              data-slug="${escapeHtml(game.slug)}"
            >
              SCORE
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderLeaderboard() {
  els.sectionTitle.textContent = "LEADERBOARD";
  els.sectionCount.textContent = `${scores.length} scores`;

  if (!scores.length) {
    els.gamingList.innerHTML = `
      <div class="empty">
        No scores yet. Submit the first score.
      </div>
    `;
    return;
  }

  els.gamingList.innerHTML = scores
    .map((score, index) => {
      return `
        <article class="game-card">
          <div class="game-row">
            <div class="game-cover">#${index + 1}</div>

            <div class="game-info">
              <strong>${number(score.score)} POINTS</strong>
              <small>${escapeHtml(score.game_slug)} · @${escapeHtml(score.username || "player")} · ${escapeHtml(score.mode || "Arcade")}</small>
              <p>${formatDate(score.created_at)}</p>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderClips() {
  els.sectionTitle.textContent = "GAME CLIPS";
  els.sectionCount.textContent = `${clips.length} clips`;

  if (!clips.length) {
    els.gamingList.innerHTML = `
      <div class="empty">
        No game clips yet. Clip system is ready for future uploads.
      </div>
    `;
    return;
  }

  els.gamingList.innerHTML = clips
    .map((clip) => {
      return `
        <article class="game-card">
          <div class="game-row">
            <div class="game-cover">
              ${coverHtml(clip.thumbnail_url, "🎬")}
            </div>

            <div class="game-info">
              <strong>${escapeHtml(clip.title)}</strong>
              <small>${escapeHtml(clip.game_slug)} · @${escapeHtml(clip.username || "player")} · ${formatDate(clip.created_at)}</small>
              <p>${number(clip.view_count)} views · ${number(clip.like_count)} likes</p>
            </div>

            ${
              clip.clip_url
                ? `
                  <button
                    class="mini-play"
                    type="button"
                    data-action="open-clip"
                    data-url="${escapeHtml(clip.clip_url)}"
                  >
                    ▶
                  </button>
                `
                : ""
            }
          </div>
        </article>
      `;
    })
    .join("");
}

/* =========================
   GAME ACTIONS
========================= */
async function playGame(slug) {
  const game = games.find((item) => item.slug === slug);
  if (!game) return;

  if (currentUser) {
    await createSession(game);
  }

  const nextPlays = Number(game.total_plays || 0) + 1;

  await supabase
    .from("games")
    .update({ total_plays: nextPlays })
    .eq("id", game.id);

  window.location.href = game.play_url || `/games/${slug}/index.html`;
}

async function createSession(game) {
  const username = getUsername(currentProfile, currentUser);

  await supabase
    .from("game_sessions")
    .insert({
      game_id: game.id,
      game_slug: game.slug,
      user_id: currentUser.id,
      username,
      result: "started",
      metadata: {
        source: "gaming.html",
        app: "Rich Bizness Mobile"
      }
    });
}

async function toggleGameLike(gameId) {
  if (!currentUser) {
    setStatus("SIGN IN TO LIKE GAMES");
    window.location.href = "/auth.html";
    return;
  }

  const liked = likedGameIds.has(gameId);

  if (liked) {
    likedGameIds.delete(gameId);
    renderActiveTab();

    const { error } = await supabase
      .from("game_likes")
      .delete()
      .eq("game_id", gameId)
      .eq("user_id", currentUser.id);

    if (error) {
      setStatus(`UNLIKE ERROR: ${error.message}`);
      await loadAllGaming();
    }

    return;
  }

  likedGameIds.add(gameId);
  renderActiveTab();

  const { error } = await supabase
    .from("game_likes")
    .insert({
      game_id: gameId,
      user_id: currentUser.id
    });

  if (error) {
    likedGameIds.delete(gameId);
    setStatus(`LIKE ERROR: ${error.message}`);
    renderActiveTab();
  }
}

async function submitScore() {
  if (!currentUser) {
    setStatus("SIGN IN TO SUBMIT SCORE");
    window.location.href = "/auth.html";
    return;
  }

  const gameSlug = els.scoreGameSelect.value;
  const game = games.find((item) => item.slug === gameSlug);

  if (!game) {
    setStatus("SELECT A GAME FIRST");
    return;
  }

  const score = Number(els.scoreInput.value || 0);
  const mode = els.modeInput.value.trim() || "Arcade";
  const result = els.resultInput.value.trim() || "score submitted";

  if (score <= 0) {
    setStatus("SCORE MUST BE GREATER THAN 0");
    return;
  }

  els.submitScoreBtn.disabled = true;
  setStatus("SUBMITTING SCORE...");

  const username = getUsername(currentProfile, currentUser);

  const { error } = await supabase
    .from("game_scores")
    .insert({
      game_id: game.id,
      game_slug: game.slug,
      user_id: currentUser.id,
      username,
      score,
      mode,
      metadata: {
        result,
        source: "gaming.html",
        app: "Rich Bizness Mobile"
      }
    });

  if (error) {
    console.error("Submit score error:", error);
    setStatus(`SCORE ERROR: ${error.message}`);
    els.submitScoreBtn.disabled = false;
    return;
  }

  if (score > Number(game.high_score || 0)) {
    await supabase
      .from("games")
      .update({ high_score: score })
      .eq("id", game.id);
  }

  await supabase
    .from("game_sessions")
    .insert({
      game_id: game.id,
      game_slug: game.slug,
      user_id: currentUser.id,
      username,
      ended_at: new Date().toISOString(),
      result,
      score,
      metadata: {
        source: "score_submit",
        app: "Rich Bizness Mobile"
      }
    });

  els.scoreInput.value = "0";
  els.resultInput.value = "";

  setStatus("SCORE LIVE");
  els.submitScoreBtn.disabled = false;

  await loadAllGaming();
}

/* =========================
   REALTIME
========================= */
function startRealtime() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }

  realtimeChannel = supabase
    .channel("rich-bizness-gaming-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "games" },
      async () => {
        await loadGames();
        renderHeader();
        renderFeatured();
        renderGameSelect();
        renderActiveTab();
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "game_scores" },
      async () => {
        await loadScores();
        renderHeader();
        renderActiveTab();
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "game_sessions" },
      async () => {
        await loadSessions();
        renderHeader();
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "game_clips" },
      async () => {
        await loadClips();
        renderActiveTab();
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "game_likes" },
      async () => {
        await loadLikedGames();
        renderActiveTab();
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "game_challenges" },
      async () => {
        await loadChallenges();
        renderHeader();
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setStatus("GAMING REALTIME CONNECTED");
      }
    });
}

/* =========================
   EVENTS
========================= */
els.tabs.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveTab(button.dataset.tab);
  });
});

els.featuredPlayBtn?.addEventListener("click", async () => {
  if (!featuredGame) return;
  await playGame(featuredGame.slug);
});

els.submitScoreBtn?.addEventListener("click", submitScore);

els.gamingList?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const action = button.dataset.action;

  if (action === "play-game") {
    await playGame(button.dataset.slug);
    return;
  }

  if (action === "like-game") {
    await toggleGameLike(button.dataset.id);
    return;
  }

  if (action === "select-score") {
    els.scoreGameSelect.value = button.dataset.slug;
    els.scoreInput.focus();
    setStatus("GAME SELECTED — ENTER SCORE");
    return;
  }

  if (action === "open-clip") {
    window.open(button.dataset.url, "_blank");
  }
});

/* =========================
   BOOT
========================= */
async function bootGaming() {
  setStatus("BOOTING GAMING...");

  await loadUser();
  await loadAllGaming();

  startRealtime();
}

bootGaming();
