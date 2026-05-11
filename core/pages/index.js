import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================
   RICH BIZNESS MOBILE INDEX
   /core/pages/index.js
   Realtime command hub brain
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

function money(cents = 0) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function text(value, fallback = "") {
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
  if (els.portalStatus) els.portalStatus.textContent = message || "LLC";
}

function setNotificationGlow(hasUnread) {
  if (!els.notificationBtn) return;
  els.notificationBtn.classList.toggle("has-unread", Boolean(hasUnread));
}

function renderProfile() {
  if (!currentProfile && !currentUser) return;

  const name = getName(currentProfile, currentUser);
  const level = text(currentProfile?.rich_level, "MAX").toUpperCase();
  const rank = text(currentProfile?.rank_title, "BIZ LEGEND").toUpperCase();

  els.homeUserName.textContent = name;
  els.homeRichLevel.textContent = level;
  els.homeBalance.textContent = money(currentProfile?.balance_cents || 0);
  els.homeRichPoints.textContent = shortCount(currentProfile?.rich_points || 0);
  els.homeRank.textContent = rank;

  if (currentProfile?.avatar_url) {
    els.homeAvatar.innerHTML = `<img src="${currentProfile.avatar_url}" alt="Profile avatar" />`;
  } else {
    els.homeAvatar.textContent = getInitial(name);
  }

  if (els.welcomeStatus) {
    els.welcomeStatus.textContent = currentUser ? "WELCOME BACK" : "WELCOME";
  }
}

async function loadUserAndProfile() {
  const { data } = await supabase.auth.getUser();
  currentUser = data?.user || null;

  if (!currentUser) {
    els.welcomeStatus.textContent = "TAP IN 💰";
    els.homeUserName.textContent = "Rich Guest";
    els.homeRichLevel.textContent = "GUEST";
    els.homeAvatar.textContent = "R";
    els.homeBalance.textContent = "$0.00";
    els.homeRichPoints.textContent = "0";
    els.homeRank.textContent = "VISITOR";
    setHubStatus("GUEST");
    return;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.warn("Index profile load:", error.message);
    setHubStatus("PROFILE");
    return;
  }

  currentProfile = profile || null;
  renderProfile();

  await supabase
    .from("profiles")
    .update({
      online_status: "online",
      last_seen_at: new Date().toISOString()
    })
    .eq("id", currentUser.id);
}

async function countRows(table, filterBuilder = null) {
  try {
    let query = supabase
      .from(table)
      .select("id", { count: "exact", head: true });

    if (filterBuilder) query = filterBuilder(query);

    const { count, error } = await query;

    if (error) {
      console.warn(`Count skipped ${table}:`, error.message);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.warn(`Count failed ${table}:`, err.message);
    return 0;
  }
}

async function loadHubStats() {
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
    countRows("gallery_uploads"),
    countRows("uploads"),
    currentUser
      ? countRows("notifications", (q) => q.eq("user_id", currentUser.id).eq("is_read", false))
      : 0,
    countRows("profiles", (q) => q.eq("online_status", "online")),
    countRows("meta_visits"),
    countRows("sports_posts"),
    countRows("products"),
    countRows("music_tracks"),
    countRows("game_scores")
  ]);

  els.liveDialSub.textContent = liveCount ? `${shortCount(liveCount)} LIVE` : "STREAM";
  els.galleryDialSub.textContent = galleryCount ? `${shortCount(galleryCount)} DROPS` : "PHOTOS";
  els.uploadDialSub.textContent = uploadCount ? `${shortCount(uploadCount)} FILES` : "CONTENT";
  els.metaDialSub.textContent = metaVisits ? `${shortCount(metaVisits)} VISITS` : "VERSE";

  els.sportsDialSub.textContent = sportsCount ? `${shortCount(sportsCount)} POSTS` : "HIGHLIGHTS";
  els.storeDialSub.textContent = storeCount ? `${shortCount(storeCount)} ITEMS` : "SHOP";
  els.musicDialSub.textContent = musicCount ? `${shortCount(musicCount)} TRACKS` : "VIBES";
  els.gamingDialSub.textContent = gamingCount ? `${shortCount(gamingCount)} SCORES` : "PLAY";

  els.homeOnline.textContent = shortCount(onlineCount);
  setNotificationGlow(unreadCount > 0);

  if (unreadCount > 0) {
    els.notificationBtn?.setAttribute("data-count", String(unreadCount));
  } else {
    els.notificationBtn?.removeAttribute("data-count");
  }

  setHubStatus("LIVE");
}

function startRealtime() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }

  realtimeChannel = supabase
    .channel("rich-bizness-index-command-hub")
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
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setHubStatus("LIVE");
      }
    });
}

window.addEventListener("beforeunload", () => {
  if (!currentUser) return;

  supabase
    .from("profiles")
    .update({
      online_status: "away",
      last_seen_at: new Date().toISOString()
    })
    .eq("id", currentUser.id);
});

async function bootIndex() {
  setHubStatus("BOOT");

  await loadUserAndProfile();
  await loadHubStats();

  startRealtime();

  if (els.activateMain) els.activateMain.textContent = "ACTIVATE";
}

bootIndex();
