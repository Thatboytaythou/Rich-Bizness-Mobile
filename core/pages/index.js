import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================================================
   RICH BIZNESS LLC
   CINEMATIC OMNI INDEX BRAIN
   /core/pages/index.js
========================================================= */

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

  feedDialSub: $("feedDialSub"),
  watchDialSub: $("watchDialSub"),
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

function setText(el, value) {
  if (el) el.textContent = value;
}

function money(cents = 0) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
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
    "Rich Guest"
  );
}

function getInitial(name = "R") {
  return String(name || "R").trim().slice(0, 1).toUpperCase();
}

function setPortalStatus(value) {
  setText(els.portalStatus, value || "LLC");
}

function setNotificationGlow(count = 0) {
  if (!els.notificationBtn) return;

  const hasUnread = Number(count || 0) > 0;
  els.notificationBtn.classList.toggle("has-unread", hasUnread);

  if (hasUnread) {
    els.notificationBtn.setAttribute("data-count", String(count));
  } else {
    els.notificationBtn.removeAttribute("data-count");
  }
}

function renderGuest() {
  currentUser = null;
  currentProfile = null;

  setText(els.welcomeStatus, "TAP IN 💰");
  setText(els.homeUserName, "Rich Guest");
  setText(els.homeRichLevel, "GUEST");
  setText(els.homeBalance, "$0.00");
  setText(els.homeRichPoints, "0");
  setText(els.homeRank, "VISITOR");

  if (els.homeAvatar) els.homeAvatar.textContent = "R";

  setPortalStatus("GUEST");
}

function renderProfile() {
  const name = getName(currentProfile, currentUser);
  const level = (currentProfile?.rich_level || "MAX").toUpperCase();
  const rank = (currentProfile?.rank_title || "BIZ LEGEND").toUpperCase();

  setText(els.welcomeStatus, currentUser ? "WELCOME BACK" : "TAP IN 💰");
  setText(els.homeUserName, name);
  setText(els.homeRichLevel, level);
  setText(els.homeBalance, money(currentProfile?.balance_cents || 0));
  setText(els.homeRichPoints, shortCount(currentProfile?.rich_points || 0));
  setText(els.homeRank, rank);

  if (els.homeAvatar) {
    if (currentProfile?.avatar_url) {
      els.homeAvatar.innerHTML = `<img src="${currentProfile.avatar_url}" alt="Profile avatar" />`;
    } else {
      els.homeAvatar.textContent = getInitial(name);
    }
  }
}

async function loadUserAndProfile() {
  const { data } = await supabase.auth.getUser();
  currentUser = data?.user || null;

  if (!currentUser) {
    renderGuest();
    return;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.warn("Profile load skipped:", error.message);
    renderProfile();
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
    let query = supabase.from(table).select("id", {
      count: "exact",
      head: true
    });

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
  setPortalStatus("SYNC");

  const [
    feedCount,
    watchCount,
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
    countRows("feed_posts"),
    countRows("live_streams"),
    countRows("live_streams", (q) => q.eq("status", "live")),
    countRows("gallery_views"),
    countRows("uploads"),
    currentUser
      ? countRows("notifications", (q) =>
          q.eq("user_id", currentUser.id).eq("is_read", false)
        )
      : 0,
    countRows("profiles", (q) => q.eq("online_status", "online")),
    countRows("meta_visits"),
    countRows("sports_posts"),
    countRows("products"),
    countRows("music_tracks"),
    countRows("game_scores")
  ]);

  setText(els.feedDialSub, feedCount ? `${shortCount(feedCount)} POSTS` : "SOCIAL");
  setText(els.watchDialSub, watchCount ? `${shortCount(watchCount)} STREAMS` : "VIEW");
  setText(els.liveDialSub, liveCount ? `${shortCount(liveCount)} LIVE` : "STREAM");
  setText(els.galleryDialSub, galleryCount ? `${shortCount(galleryCount)} VIEWS` : "PHOTOS");
  setText(els.uploadDialSub, uploadCount ? `${shortCount(uploadCount)} FILES` : "CONTENT");
  setText(els.metaDialSub, metaVisits ? `${shortCount(metaVisits)} VISITS` : "VERSE");
  setText(els.sportsDialSub, sportsCount ? `${shortCount(sportsCount)} POSTS` : "HIGHLIGHTS");
  setText(els.storeDialSub, storeCount ? `${shortCount(storeCount)} ITEMS` : "SHOP");
  setText(els.musicDialSub, musicCount ? `${shortCount(musicCount)} TRACKS` : "VIBES");
  setText(els.gamingDialSub, gamingCount ? `${shortCount(gamingCount)} SCORES` : "PLAY");

  setText(els.homeOnline, shortCount(onlineCount));
  setNotificationGlow(unreadCount);

  setPortalStatus(window.RB_ACTIVE_KEY?.toUpperCase?.() || "LIVE");
}

function startRealtime() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }

  realtimeChannel = supabase
    .channel("rich-bizness-cinematic-index")
    .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, async (payload) => {
      if (payload.new?.id === currentUser?.id) {
        currentProfile = payload.new;
        renderProfile();
      }

      await loadHubStats();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, loadHubStats)
    .on("postgres_changes", { event: "*", schema: "public", table: "feed_posts" }, loadHubStats)
    .on("postgres_changes", { event: "*", schema: "public", table: "live_streams" }, loadHubStats)
    .on("postgres_changes", { event: "*", schema: "public", table: "uploads" }, loadHubStats)
    .on("postgres_changes", { event: "*", schema: "public", table: "meta_visits" }, loadHubStats)
    .on("postgres_changes", { event: "*", schema: "public", table: "sports_posts" }, loadHubStats)
    .on("postgres_changes", { event: "*", schema: "public", table: "products" }, loadHubStats)
    .on("postgres_changes", { event: "*", schema: "public", table: "music_tracks" }, loadHubStats)
    .on("postgres_changes", { event: "*", schema: "public", table: "game_scores" }, loadHubStats)
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setPortalStatus(window.RB_ACTIVE_KEY?.toUpperCase?.() || "LIVE");
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
  setPortalStatus("BOOT");

  await loadUserAndProfile();
  await loadHubStats();

  startRealtime();

  setText(els.activateMain, "ACTIVATE");
}

bootIndex();
