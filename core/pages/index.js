import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================
   RICH BIZNESS MOBILE INDEX
   CINEMATIC UNIVERSAL MASTERPIECE
   ULTRA REALISTIC HD 4D APP HUB
   REALTIME IMMERSIVE COMMAND CORE
   MULTI-DEVICE CINEMA SYSTEM
   /core/pages/index.js
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
  welcomeStatus: $("welcomeStatus"),
  homeUserName: $("homeUserName"),
  homeAvatar: $("homeAvatar"),
  homeRichLevel: $("homeRichLevel"),

  notificationBtn: $("notificationBtn"),
  portalStatus: $("portalStatus"),
  activateMain: $("activateMain"),
  activateSub: $("activateSub"),

  homeBalance: $("homeBalance"),
  homeRichPoints: $("homeRichPoints"),
  homeRank: $("homeRank"),
  homeOnline: $("homeOnline"),

  liveDialSub: $("liveDialSub"),
  galleryDialSub: $("galleryDialSub"),
  musicDialSub: $("musicDialSub"),
  uploadDialSub: $("uploadDialSub"),
  gamingDialSub: $("gamingDialSub"),
  sportsDialSub: $("sportsDialSub"),
  metaDialSub: $("metaDialSub"),
  storeDialSub: $("storeDialSub")
};

let currentUser = null;
let currentProfile = null;
let realtimeChannel = null;
let statsLoading = false;
let statsQueued = false;

function safeSet(el, value) {
  if (el) el.textContent = value;
}

function money(cents = 0) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function cleanText(value, fallback = "") {
  return value === null || value === undefined || value === "" ? fallback : value;
}

function shortCount(value = 0) {
  const n = Number(value || 0);

  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;

  return n.toLocaleString();
}

function getName(profile, user) {
  return (
    profile?.display_name ||
    profile?.username ||
    user?.email?.split("@")[0] ||
    "Rich Creator"
  );
}

function getInitial(name = "R") {
  return String(name || "R").trim().slice(0, 1).toUpperCase();
}

function setHubStatus(message) {
  safeSet(els.portalStatus, message || "LLC");
}

function setNotificationGlow(count = 0) {
  if (!els.notificationBtn) return;

  const unread = Number(count || 0);

  els.notificationBtn.classList.toggle("has-unread", unread > 0);

  if (unread > 0) {
    els.notificationBtn.setAttribute("data-count", unread > 99 ? "99+" : String(unread));
  } else {
    els.notificationBtn.removeAttribute("data-count");
  }
}

function renderGuest() {
  safeSet(els.welcomeStatus, "TAP IN 💰");
  safeSet(els.homeUserName, "Rich Guest");
  safeSet(els.homeRichLevel, "GUEST");
  safeSet(els.homeAvatar, "R");
  safeSet(els.homeBalance, "$0.00");
  safeSet(els.homeRichPoints, "0");
  safeSet(els.homeRank, "VISITOR");
  setHubStatus("GUEST");
}

function renderProfile() {
  if (!currentProfile && !currentUser) {
    renderGuest();
    return;
  }

  const name = getName(currentProfile, currentUser);
  const level = cleanText(currentProfile?.rich_level, "MAX").toUpperCase();
  const rank = cleanText(currentProfile?.rank_title, "BIZ LEGEND").toUpperCase();

  safeSet(els.homeUserName, name);
  safeSet(els.homeRichLevel, level);
  safeSet(els.homeBalance, money(currentProfile?.balance_cents || 0));
  safeSet(els.homeRichPoints, shortCount(currentProfile?.rich_points || 0));
  safeSet(els.homeRank, rank);
  safeSet(els.welcomeStatus, currentUser ? "WELCOME BACK" : "WELCOME");

  if (els.homeAvatar) {
    if (currentProfile?.avatar_url) {
      els.homeAvatar.innerHTML = `<img src="${currentProfile.avatar_url}" alt="Profile avatar" />`;
    } else {
      els.homeAvatar.textContent = getInitial(name);
    }
  }
}

async function loadUserAndProfile() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.warn("Index auth load:", error.message);
  }

  currentUser = data?.user || null;

  if (!currentUser) {
    currentProfile = null;
    renderGuest();
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (profileError) {
    console.warn("Index profile load:", profileError.message);
    setHubStatus("PROFILE");
    renderProfile();
    return;
  }

  currentProfile = profile || null;
  renderProfile();

  await supabase
    .from("profiles")
    .update({
      online_status: "online",
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", currentUser.id);
}

async function countRows(table, filterBuilder = null) {
  try {
    let query = supabase
      .from(table)
      .select("id", { count: "exact", head: true });

    if (typeof filterBuilder === "function") {
      query = filterBuilder(query);
    }

    const { count, error } = await query;

    if (error) {
      console.warn(`Index count skipped ${table}:`, error.message);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.warn(`Index count failed ${table}:`, err.message);
    return 0;
  }
}

async function countGalleryDrops() {
  const sectionGallery = await countRows("uploads", (q) => q.eq("section", "gallery"));
  if (sectionGallery > 0) return sectionGallery;

  return countRows("uploads", (q) => q.eq("category", "gallery"));
}

async function countGamingActivity() {
  const scores = await countRows("game_scores");
  if (scores > 0) return scores;

  return countRows("games", (q) => q.eq("is_active", true));
}

async function loadHubStats() {
  if (statsLoading) {
    statsQueued = true;
    return;
  }

  statsLoading = true;
  statsQueued = false;
  setHubStatus("SYNC");

  const [
    liveCount,
    galleryCount,
    uploadCount,
    unreadCount,
    onlineCount,
    metaVisits,
    sportsCount,
    storeCount,
    musicCount,
    gamingCount
  ] = await Promise.all([
    countRows("live_streams", (q) => q.eq("status", "live")),
    countGalleryDrops(),
    countRows("uploads"),
    currentUser
      ? countRows("notifications", (q) => q.eq("user_id", currentUser.id).eq("is_read", false))
      : 0,
    countRows("profiles", (q) => q.eq("online_status", "online")),
    countRows("meta_visits"),
    countRows("sports_posts"),
    countRows("products", (q) => q.eq("status", "active")),
    countRows("music_tracks"),
    countGamingActivity()
  ]);

  safeSet(els.liveDialSub, liveCount ? `${shortCount(liveCount)} LIVE` : "STREAM");
  safeSet(els.galleryDialSub, galleryCount ? `${shortCount(galleryCount)} DROPS` : "PHOTOS");
  safeSet(els.uploadDialSub, uploadCount ? `${shortCount(uploadCount)} FILES` : "CONTENT");
  safeSet(els.metaDialSub, metaVisits ? `${shortCount(metaVisits)} VISITS` : "VERSE");

  safeSet(els.sportsDialSub, sportsCount ? `${shortCount(sportsCount)} POSTS` : "HIGHLIGHTS");
  safeSet(els.storeDialSub, storeCount ? `${shortCount(storeCount)} ITEMS` : "SHOP");
  safeSet(els.musicDialSub, musicCount ? `${shortCount(musicCount)} TRACKS` : "VIBES");
  safeSet(els.gamingDialSub, gamingCount ? `${shortCount(gamingCount)} SCORES` : "PLAY");

  safeSet(els.homeOnline, shortCount(onlineCount));
  setNotificationGlow(unreadCount);

  setHubStatus("LIVE");

  statsLoading = false;

  if (statsQueued) {
    loadHubStats();
  }
}

function startRealtime() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }

  realtimeChannel = supabase
    .channel("rich-bizness-index-hd4d-command-core")
    .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, async (payload) => {
      if (payload.new?.id === currentUser?.id) {
        currentProfile = payload.new;
        renderProfile();
      }

      await loadHubStats();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, loadHubStats)
    .on("postgres_changes", { event: "*", schema: "public", table: "live_streams" }, loadHubStats)
    .on("postgres_changes", { event: "*", schema: "public", table: "uploads" }, loadHubStats)
    .on("postgres_changes", { event: "*", schema: "public", table: "meta_visits" }, loadHubStats)
    .on("postgres_changes", { event: "*", schema: "public", table: "sports_posts" }, loadHubStats)
    .on("postgres_changes", { event: "*", schema: "public", table: "products" }, loadHubStats)
    .on("postgres_changes", { event: "*", schema: "public", table: "music_tracks" }, loadHubStats)
    .on("postgres_changes", { event: "*", schema: "public", table: "game_scores" }, loadHubStats)
    .on("postgres_changes", { event: "*", schema: "public", table: "games" }, loadHubStats)
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setHubStatus("LIVE");
      }
    });
}

async function markAway() {
  if (!currentUser) return;

  await supabase
    .from("profiles")
    .update({
      online_status: "away",
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", currentUser.id);
}

window.addEventListener("beforeunload", () => {
  markAway();
});

document.addEventListener("visibilitychange", async () => {
  if (!currentUser) return;

  if (document.visibilityState === "visible") {
    await supabase
      .from("profiles")
      .update({
        online_status: "online",
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", currentUser.id);

    await loadHubStats();
  } else {
    await markAway();
  }
});

supabase.auth.onAuthStateChange(async (_event, session) => {
  currentUser = session?.user || null;

  await loadUserAndProfile();
  await loadHubStats();
});

async function bootIndex() {
  setHubStatus("BOOT");

  if (els.activateMain) els.activateMain.textContent = "ACTIVATE";
  if (els.activateSub) els.activateSub.textContent = "ENTER LIVE";

  await loadUserAndProfile();
  await loadHubStats();
  startRealtime();
}

bootIndex();
