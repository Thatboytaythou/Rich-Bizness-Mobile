import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================
   RICH BIZNESS MOBILE SPORTS
   /core/pages/sports.js
   Live Media + Picks Money Engine
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

  statBroadcasts: $("statBroadcasts"),
  statPicks: $("statPicks"),
  statWin: $("statWin"),
  statPoints: $("statPoints"),

  featuredIcon: $("featuredIcon"),
  featuredTitle: $("featuredTitle"),
  featuredDescription: $("featuredDescription"),
  featuredBtn: $("featuredBtn"),

  dropType: $("dropType"),
  titleInput: $("titleInput"),
  sportInput: $("sportInput"),
  teamInput: $("teamInput"),
  opponentInput: $("opponentInput"),
  confidenceInput: $("confidenceInput"),
  oddsInput: $("oddsInput"),
  winInput: $("winInput"),
  bodyInput: $("bodyInput"),
  mediaUrlInput: $("mediaUrlInput"),
  coverUrlInput: $("coverUrlInput"),

  createSportsBtn: $("createSportsBtn"),
  sportsStatus: $("sportsStatus"),
  sectionTitle: $("sectionTitle"),
  sectionCount: $("sectionCount"),
  sportsList: $("sportsList")
};

let currentUser = null;
let currentProfile = null;
let sportsProfile = null;

let activeTab = "broadcasts";
let broadcasts = [];
let picks = [];
let posts = [];
let brackets = [];
let likedIds = new Set();

let featuredPick = null;
let realtimeChannel = null;

function setStatus(message) {
  if (els.sportsStatus) els.sportsStatus.textContent = message || "";
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(cents = 0) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function number(value = 0) {
  return Number(value || 0).toLocaleString();
}

function getUsername(profile, user) {
  return profile?.username || user?.email?.split("@")[0] || "fan";
}

function getDisplayName(profile, user) {
  return profile?.display_name || profile?.username || user?.email?.split("@")[0] || "Sports Fan";
}

function mediaThumb(url, fallback = "🏆") {
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
    console.warn("Sports auth error:", error);
  }

  currentUser = data?.user || null;

  if (!currentUser) {
    els.createSportsBtn.disabled = true;
    setStatus("SIGN IN REQUIRED TO DROP SPORTS");
    return;
  }

  els.createSportsBtn.disabled = false;
  await loadProfile();
  await ensureSportsProfile();
}

async function loadProfile() {
  if (!currentUser) return;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.warn("Sports profile load error:", error);
  }

  currentProfile = data || null;
}

async function ensureSportsProfile() {
  if (!currentUser) return;

  const username = getUsername(currentProfile, currentUser);
  const displayName = getDisplayName(currentProfile, currentUser);

  const { data, error } = await supabase
    .from("sports_profiles")
    .select("*")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.warn("Sports profile check error:", error);
    return;
  }

  if (data) {
    sportsProfile = data;
    return;
  }

  const { data: created, error: createError } = await supabase
    .from("sports_profiles")
    .insert({
      user_id: currentUser.id,
      username,
      display_name: displayName,
      favorite_sport: "Sports",
      favorite_team: "",
      fan_tag: "BIZ FAN",
      bio: "Rich Bizness Sports fan"
    })
    .select("*")
    .single();

  if (createError) {
    console.warn("Sports profile create error:", createError);
    return;
  }

  sportsProfile = created;
}

/* =========================
   LOAD DATA
========================= */
async function loadBroadcasts() {
  const { data, error } = await supabase
    .from("sports_broadcasts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Sports broadcasts error:", error);
    setStatus(`BROADCAST ERROR: ${error.message}`);
    return;
  }

  broadcasts = data || [];
}

async function loadPicks() {
  const { data, error } = await supabase
    .from("sports_picks")
    .select("*")
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Sports picks error:", error);
    setStatus(`PICKS ERROR: ${error.message}`);
    return;
  }

  picks = data || [];
  featuredPick = picks.find((pick) => pick.is_featured) || picks[0] || null;
}

async function loadPosts() {
  const { data, error } = await supabase
    .from("sports_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Sports posts error:", error);
    setStatus(`MEDIA ERROR: ${error.message}`);
    return;
  }

  posts = data || [];
}

async function loadBrackets() {
  const { data, error } = await supabase
    .from("sports_brackets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    console.warn("Sports brackets error:", error);
    return;
  }

  brackets = data || [];
}

async function loadLikes() {
  likedIds = new Set();

  if (!currentUser) return;

  const { data, error } = await supabase
    .from("sports_likes")
    .select("post_id,broadcast_id,pick_id")
    .eq("user_id", currentUser.id);

  if (error) {
    console.warn("Sports likes error:", error);
    return;
  }

  (data || []).forEach((row) => {
    if (row.post_id) likedIds.add(`post:${row.post_id}`);
    if (row.broadcast_id) likedIds.add(`broadcast:${row.broadcast_id}`);
    if (row.pick_id) likedIds.add(`pick:${row.pick_id}`);
  });
}

async function loadAllSports() {
  setStatus("LOADING REALTIME SPORTS...");

  await loadBroadcasts();
  await loadPicks();
  await loadPosts();
  await loadBrackets();
  await loadLikes();

  renderHeader();
  renderFeatured();
  renderActiveTab();

  setStatus("SPORTS REALTIME CONNECTED");
}

/* =========================
   RENDER
========================= */
function renderHeader() {
  const totalWin = picks.reduce(
    (sum, pick) => sum + Number(pick.potential_win_cents || 0),
    0
  );

  els.statBroadcasts.textContent = number(broadcasts.length);
  els.statPicks.textContent = number(picks.length);
  els.statWin.textContent = money(totalWin);
  els.statPoints.textContent = number(sportsProfile?.points || 0);
}

function renderFeatured() {
  if (!featuredPick) {
    els.featuredIcon.textContent = "💰";
    els.featuredTitle.textContent = "Create the first big win pick";
    els.featuredDescription.textContent =
      "Premium picks, confidence, odds text, and potential win tracking are ready.";
    return;
  }

  els.featuredIcon.textContent = "💰";
  els.featuredTitle.textContent = featuredPick.title;
  els.featuredDescription.textContent =
    `${featuredPick.prediction} · ${featuredPick.confidence || 50}% confidence · ${money(featuredPick.potential_win_cents)}`;
}

function setActiveTab(tab) {
  activeTab = tab;

  els.tabs.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.tab === tab);
  });

  renderActiveTab();
}

function renderActiveTab() {
  if (activeTab === "broadcasts") return renderBroadcasts();
  if (activeTab === "picks") return renderPicks();
  if (activeTab === "posts") return renderPosts();
  return renderBrackets();
}

function renderBroadcasts() {
  els.sectionTitle.textContent = "LIVE BROADCASTS";
  els.sectionCount.textContent = `${broadcasts.length} live`;

  if (!broadcasts.length) {
    els.sportsList.innerHTML = `<div class="empty">No sports broadcasts yet. Drop the first live media broadcast.</div>`;
    return;
  }

  els.sportsList.innerHTML = broadcasts.map((item) => {
    const liked = likedIds.has(`broadcast:${item.id}`);

    return `
      <article class="sports-card">
        <div class="sports-row">
          <div class="thumb">${mediaThumb(item.cover_url, "📡")}</div>

          <div class="sports-info">
            <strong>${escapeHtml(item.title)}</strong>
            <small>${escapeHtml(item.status || "scheduled")} · ${escapeHtml(item.sport || "Sports")} · ${escapeHtml(item.access_type || "free")}</small>
            ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
          </div>

          <button class="play-btn" type="button" data-action="open-broadcast" data-url="${escapeHtml(item.stream_url || item.replay_url || "")}">
            ▶
          </button>
        </div>

        <div class="actions">
          <button class="action-btn" type="button" data-action="open-broadcast" data-url="${escapeHtml(item.stream_url || item.replay_url || "")}">
            WATCH
          </button>
          <button class="action-btn" type="button" data-action="like-broadcast" data-id="${escapeHtml(item.id)}">
            ${liked ? "💚" : "♡"} LIKE
          </button>
          <button class="action-btn" type="button" data-action="comment-broadcast" data-id="${escapeHtml(item.id)}">
            💬 COMMENT
          </button>
        </div>
      </article>
    `;
  }).join("");
}

function renderPicks() {
  els.sectionTitle.textContent = "MONEY PICKS";
  els.sectionCount.textContent = `${picks.length} picks`;

  if (!picks.length) {
    els.sportsList.innerHTML = `<div class="empty">No money picks yet. Create the first big win opportunity.</div>`;
    return;
  }

  els.sportsList.innerHTML = picks.map((pick) => {
    const liked = likedIds.has(`pick:${pick.id}`);

    return `
      <article class="sports-card">
        <div class="sports-row">
          <div class="thumb">💰</div>

          <div class="sports-info">
            <strong>${escapeHtml(pick.title)}</strong>
            <small>${escapeHtml(pick.sport || "Sports")} · ${escapeHtml(pick.odds_text || "PICK")} · ${pick.confidence || 50}% CONFIDENCE</small>
            <p>${escapeHtml(pick.prediction)} · Potential: ${money(pick.potential_win_cents)}</p>
          </div>

          <button class="play-btn" type="button" data-action="view-pick" data-id="${escapeHtml(pick.id)}">
            $
          </button>
        </div>

        <div class="actions">
          <button class="action-btn" type="button" data-action="view-pick" data-id="${escapeHtml(pick.id)}">
            VIEW PICK
          </button>
          <button class="action-btn" type="button" data-action="like-pick" data-id="${escapeHtml(pick.id)}">
            ${liked ? "💚" : "♡"} LIKE
          </button>
          <button class="action-btn" type="button" data-action="comment-pick" data-id="${escapeHtml(pick.id)}">
            💬 COMMENT
          </button>
        </div>
      </article>
    `;
  }).join("");
}

function renderPosts() {
  els.sectionTitle.textContent = "SPORTS MEDIA";
  els.sectionCount.textContent = `${posts.length} posts`;

  if (!posts.length) {
    els.sportsList.innerHTML = `<div class="empty">No sports media yet. Drop highlights, clips, takes, or fan posts.</div>`;
    return;
  }

  els.sportsList.innerHTML = posts.map((post) => {
    const liked = likedIds.has(`post:${post.id}`);

    return `
      <article class="sports-card">
        <div class="sports-row">
          <div class="thumb">${mediaThumb(post.cover_url || post.media_url, "🏆")}</div>

          <div class="sports-info">
            <strong>${escapeHtml(post.title)}</strong>
            <small>@${escapeHtml(post.username || "fan")} · ${escapeHtml(post.sport || "Sports")} · ${formatDate(post.created_at)}</small>
            ${post.body ? `<p>${escapeHtml(post.body)}</p>` : ""}
          </div>

          <button class="play-btn" type="button" data-action="open-media" data-url="${escapeHtml(post.media_url || "")}">
            ▶
          </button>
        </div>

        <div class="actions">
          <button class="action-btn" type="button" data-action="open-media" data-url="${escapeHtml(post.media_url || "")}">
            OPEN
          </button>
          <button class="action-btn" type="button" data-action="like-post" data-id="${escapeHtml(post.id)}">
            ${liked ? "💚" : "♡"} LIKE
          </button>
          <button class="action-btn" type="button" data-action="comment-post" data-id="${escapeHtml(post.id)}">
            💬 COMMENT
          </button>
        </div>
      </article>
    `;
  }).join("");
}

function renderBrackets() {
  els.sectionTitle.textContent = "BRACKETS";
  els.sectionCount.textContent = `${brackets.length} brackets`;

  if (!brackets.length) {
    els.sportsList.innerHTML = `<div class="empty">No brackets yet. Create the first Rich Bizness bracket.</div>`;
    return;
  }

  els.sportsList.innerHTML = brackets.map((bracket) => {
    return `
      <article class="sports-card">
        <div class="sports-row">
          <div class="thumb">🧩</div>

          <div class="sports-info">
            <strong>${escapeHtml(bracket.title)}</strong>
            <small>${escapeHtml(bracket.sport || "Sports")} · ${escapeHtml(bracket.status || "open")} · Prize ${money(bracket.prize_cents)}</small>
            <p>@${escapeHtml(bracket.username || "fan")} · ${formatDate(bracket.created_at)}</p>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

/* =========================
   CREATE DROP
========================= */
async function createSportsDrop() {
  if (!currentUser) {
    window.location.href = "/auth.html";
    return;
  }

  const type = els.dropType.value;
  const title = els.titleInput.value.trim();
  const sport = els.sportInput.value.trim() || "Sports";
  const team = els.teamInput.value.trim();
  const opponent = els.opponentInput.value.trim();
  const confidence = Number(els.confidenceInput.value || 50);
  const odds = els.oddsInput.value.trim();
  const potentialWin = Number(els.winInput.value || 0);
  const body = els.bodyInput.value.trim();
  const mediaUrl = els.mediaUrlInput.value.trim();
  const coverUrl = els.coverUrlInput.value.trim();

  if (!title) {
    setStatus("TITLE REQUIRED");
    return;
  }

  const username = getUsername(currentProfile, currentUser);
  const displayName = getDisplayName(currentProfile, currentUser);

  els.createSportsBtn.disabled = true;
  setStatus("CREATING SPORTS DROP...");

  let error = null;

  if (type === "broadcast") {
    ({ error } = await supabase.from("sports_broadcasts").insert({
      user_id: currentUser.id,
      username,
      display_name: displayName,
      title,
      description: body || null,
      sport,
      team_name: team || null,
      stream_url: mediaUrl || null,
      cover_url: coverUrl || null,
      status: mediaUrl ? "live" : "scheduled",
      access_type: potentialWin > 0 ? "premium" : "free",
      price_cents: 0
    }));
  }

  if (type === "pick") {
    ({ error } = await supabase.from("sports_picks").insert({
      user_id: currentUser.id,
      username,
      display_name: displayName,
      title,
      sport,
      team_name: team || null,
      opponent: opponent || null,
      prediction: body || title,
      confidence,
      odds_text: odds || null,
      potential_win_cents: potentialWin,
      is_premium: potentialWin > 0,
      is_featured: picks.length === 0
    }));
  }

  if (type === "post") {
    ({ error } = await supabase.from("sports_posts").insert({
      user_id: currentUser.id,
      username,
      display_name: displayName,
      title,
      body: body || null,
      sport,
      team_name: team || null,
      media_url: mediaUrl || null,
      media_type: mediaUrl ? "media" : "text",
      cover_url: coverUrl || null
    }));
  }

  if (type === "bracket") {
    ({ error } = await supabase.from("sports_brackets").insert({
      user_id: currentUser.id,
      username,
      title,
      sport,
      prize_cents: potentialWin,
      bracket_data: {
        team,
        opponent,
        note: body
      }
    }));
  }

  if (error) {
    console.error("Sports create error:", error);
    setStatus(`DROP ERROR: ${error.message}`);
    els.createSportsBtn.disabled = false;
    return;
  }

  els.titleInput.value = "";
  els.teamInput.value = "";
  els.opponentInput.value = "";
  els.oddsInput.value = "";
  els.winInput.value = "0";
  els.bodyInput.value = "";
  els.mediaUrlInput.value = "";
  els.coverUrlInput.value = "";

  setStatus("SPORTS DROP LIVE");
  els.createSportsBtn.disabled = false;

  await loadAllSports();
}

/* =========================
   ACTIONS
========================= */
async function likeTarget(type, id) {
  if (!currentUser) {
    window.location.href = "/auth.html";
    return;
  }

  const key = `${type}:${id}`;
  const alreadyLiked = likedIds.has(key);

  if (alreadyLiked) {
    setStatus("ALREADY LIKED");
    return;
  }

  const payload = {
    user_id: currentUser.id
  };

  if (type === "post") payload.post_id = id;
  if (type === "broadcast") payload.broadcast_id = id;
  if (type === "pick") payload.pick_id = id;

  const { error } = await supabase.from("sports_likes").insert(payload);

  if (error) {
    setStatus(`LIKE ERROR: ${error.message}`);
    return;
  }

  likedIds.add(key);
  renderActiveTab();
  setStatus("SPORTS LIKE LIVE");
}

async function commentTarget(type, id) {
  if (!currentUser) {
    window.location.href = "/auth.html";
    return;
  }

  const body = prompt("Drop a sports comment:");
  if (!body || !body.trim()) return;

  const payload = {
    user_id: currentUser.id,
    username: getUsername(currentProfile, currentUser),
    body: body.trim()
  };

  if (type === "post") payload.post_id = id;
  if (type === "broadcast") payload.broadcast_id = id;
  if (type === "pick") payload.pick_id = id;

  const { error } = await supabase.from("sports_comments").insert(payload);

  if (error) {
    setStatus(`COMMENT ERROR: ${error.message}`);
    return;
  }

  setStatus("SPORTS COMMENT LIVE");
}

function openUrl(url) {
  if (!url) {
    setStatus("NO MEDIA URL YET");
    return;
  }

  window.open(url, "_blank");
}

/* =========================
   REALTIME
========================= */
function startRealtime() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }

  realtimeChannel = supabase
    .channel("rich-bizness-sports-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "sports_broadcasts" }, async () => {
      await loadBroadcasts();
      renderHeader();
      renderActiveTab();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "sports_picks" }, async () => {
      await loadPicks();
      renderHeader();
      renderFeatured();
      renderActiveTab();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "sports_posts" }, async () => {
      await loadPosts();
      renderActiveTab();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "sports_brackets" }, async () => {
      await loadBrackets();
      renderActiveTab();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "sports_likes" }, async () => {
      await loadLikes();
      renderActiveTab();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "sports_comments" }, async () => {
      setStatus("SPORTS COMMENT UPDATED LIVE");
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setStatus("SPORTS REALTIME CONNECTED");
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

els.dropType?.addEventListener("change", () => {
  const type = els.dropType.value;

  if (type === "broadcast") setActiveTab("broadcasts");
  if (type === "pick") setActiveTab("picks");
  if (type === "post") setActiveTab("posts");
  if (type === "bracket") setActiveTab("brackets");
});

els.createSportsBtn?.addEventListener("click", createSportsDrop);

els.featuredBtn?.addEventListener("click", () => {
  setActiveTab("picks");
  document.getElementById("sportsList")?.scrollIntoView({ behavior: "smooth" });
});

els.sportsList?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id;
  const url = button.dataset.url;

  if (action === "open-broadcast" || action === "open-media") {
    openUrl(url);
    return;
  }

  if (action === "view-pick") {
    setStatus("BIG WIN PICK SELECTED");
    return;
  }

  if (action === "like-broadcast") return likeTarget("broadcast", id);
  if (action === "like-pick") return likeTarget("pick", id);
  if (action === "like-post") return likeTarget("post", id);

  if (action === "comment-broadcast") return commentTarget("broadcast", id);
  if (action === "comment-pick") return commentTarget("pick", id);
  if (action === "comment-post") return commentTarget("post", id);
});

/* =========================
   BOOT
========================= */
async function bootSports() {
  setStatus("BOOTING SPORTS...");

  await loadUser();
  await loadAllSports();

  startRealtime();
}

bootSports();
