import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================================================
   RICH BIZNESS LLC
   CINEMATIC UNIVERSAL INDEX BRAIN
   REALTIME PROFILE / COUNTS / PORTAL STATE
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
  centerPortal: $("centerPortal"),

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
let refreshTimer = null;

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

function safeUpper(value, fallback) {
  return String(value || fallback || "").toUpperCase();
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

function getActiveKey() {
  return window.RB_ACTIVE_KEY || "live";
}

function getActiveTitle() {
  const key = getActiveKey();
  const card = document.querySelector(`[data-dial-card="${key}"]`);
  return card?.querySelector(".dial-title")?.textContent || key.toUpperCase();
}

function setPortalStatus(value) {
  setText(els.portalStatus, value || "LLC");
}

function setPageState(state) {
  document.body.dataset.indexState = state;
}

function setNotificationGlow(count = 0) {
  if (!els.notificationBtn) return;

  const unread = Number(count || 0);
  const hasUnread = unread > 0;

  els.notificationBtn.classList.toggle("has-unread", hasUnread);

  if (hasUnread) {
    els.notificationBtn.setAttribute("data-count", String(unread));
  } else {
    els.notificationBtn.removeAttribute("data-count");
  }
}

function setDialSub(key, value) {
  const map = {
    feed: els.feedDialSub,
    watch: els.watchDialSub,
    live: els.liveDialSub,
    gallery: els.galleryDialSub,
    music: els.musicDialSub,
    upload: els.uploadDialSub,
    gaming: els.gamingDialSub,
    sports: els.sportsDialSub,
    meta: els.metaDialSub,
    store: els.storeDialSub
  };

  setText(map[key], value);
}

function syncPortalWithActive() {
  const key = getActiveKey();
  const title = getActiveTitle();

  setPortalStatus(title);

  if (els.centerPortal) {
    els.centerPortal.dataset.activePortal = key;
  }

  if (els.activateSub) {
    els.activateSub.textContent = `ENTER ${title}`;
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

  if (els.homeAvatar) {
    els.homeAvatar.innerHTML = "";
    els.homeAvatar.textContent = "R";
  }

  syncPortalWithActive();
}

function renderProfile() {
  if (!currentUser && !currentProfile) {
    renderGuest();
    return;
  }

  const name = getName(currentProfile, currentUser);
  const level = safeUpper(currentProfile?.rich_level, "MAX");
  const rank = safeUpper(currentProfile?.rank_title, "BIZ LEGEND");

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
      els.homeAvatar.innerHTML = "";
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
    console.warn("Rich Bizness profile load skipped:", error.message);
    currentProfile = null;
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
      console.warn(`Rich Bizness count skipped ${table}:`, error.message);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.warn(`Rich Bizness count failed ${table}:`, err.message);
    return 0;
  }
}

async function loadHubStats() {
  setPageState("syncing");
  document.body.classList.add("syncing");

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

  setDialSub("feed", feedCount ? `${shortCount(feedCount)} POSTS` : "SOCIAL");
  setDialSub("watch", watchCount ? `${shortCount(watchCount)} STREAMS` : "VIEW");
  setDialSub("live", liveCount ? `${shortCount(liveCount)} LIVE` : "STREAM");
  setDialSub("gallery", galleryCount ? `${shortCount(galleryCount)} VIEWS` : "PHOTOS");
  setDialSub("upload", uploadCount ? `${shortCount(uploadCount)} FILES` : "CONTENT");
  setDialSub("meta", metaVisits ? `${shortCount(metaVisits)} VISITS` : "VERSE");
  setDialSub("sports", sportsCount ? `${shortCount(sportsCount)} POSTS` : "HIGHLIGHTS");
  setDialSub("store", storeCount ? `${shortCount(storeCount)} ITEMS` : "SHOP");
  setDialSub("music", musicCount ? `${shortCount(musicCount)} TRACKS` : "VIBES");
  setDialSub("gaming", gamingCount ? `${shortCount(gamingCount)} SCORES` : "PLAY");

  setText(els.homeOnline, shortCount(onlineCount));
  setNotificationGlow(unreadCount);

  syncPortalWithActive();

  document.body.classList.remove("syncing");
  setPageState("live");
}

function scheduleHubRefresh() {
  clearTimeout(refreshTimer);

  refreshTimer = setTimeout(() => {
    loadHubStats();
  }, 350);
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

      scheduleHubRefresh();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, scheduleHubRefresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "feed_posts" }, scheduleHubRefresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "live_streams" }, scheduleHubRefresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "uploads" }, scheduleHubRefresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "meta_visits" }, scheduleHubRefresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "sports_posts" }, scheduleHubRefresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "products" }, scheduleHubRefresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "music_tracks" }, scheduleHubRefresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "game_scores" }, scheduleHubRefresh)
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setPageState("live");
        syncPortalWithActive();
      }
    });
}

function hookActiveWatcher() {
  let lastKey = getActiveKey();

  setInterval(() => {
    const next = getActiveKey();

    if (next !== lastKey) {
      lastKey = next;
      syncPortalWithActive();
    }
  }, 120);
}

function hookAuthChanges() {
  supabase.auth.onAuthStateChange(async () => {
    await loadUserAndProfile();
    await loadHubStats();
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
  setPageState("boot");
  setPortalStatus("BOOT");

  if (!window.RB_ACTIVE_KEY) window.RB_ACTIVE_KEY = "live";
  if (!window.RB_ACTIVE_ROUTE) window.RB_ACTIVE_ROUTE = "/live.html";

  setText(els.activateMain, "ACTIVATE");

  await loadUserAndProfile();
  await loadHubStats();

  startRealtime();
  hookActiveWatcher();
  hookAuthChanges();

  syncPortalWithActive();
  setPageState("live");
}

bootIndex();
