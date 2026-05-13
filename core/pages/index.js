/* =========================================================
   RICH BIZNESS LLC
   CINEMATIC UNIVERSAL REALTIME INDEX
   FULL MATCHING INDEX.JS
   /core/pages/index.js
========================================================= */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
  "https://zsancpcyhdidrlezggrl.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_Hahozdb2FpB9cDsoWEEJzQ_WA_xdWV2";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    auth:{
      persistSession:true,
      autoRefreshToken:true,
      detectSessionInUrl:true
    },
    realtime:{
      params:{
        eventsPerSecond:10
      }
    }
  }
);

/* =========================================================
   HELPERS
========================================================= */

const $ = (id) => document.getElementById(id);

const els = {

  welcomeStatus:$("welcomeStatus"),
  homeUserName:$("homeUserName"),
  homeAvatar:$("homeAvatar"),
  homeRichLevel:$("homeRichLevel"),

  notificationBtn:$("notificationBtn"),

  portalStatus:$("portalStatus"),

  activateMain:$("activateMain"),
  activateSub:$("activateSub"),

  homeBalance:$("homeBalance"),
  homeRichPoints:$("homeRichPoints"),
  homeRank:$("homeRank"),
  homeOnline:$("homeOnline"),

  liveDialSub:$("liveDialSub"),
  musicDialSub:$("musicDialSub"),
  gamingDialSub:$("gamingDialSub"),
  sportsDialSub:$("sportsDialSub"),
  galleryDialSub:$("galleryDialSub"),
  uploadDialSub:$("uploadDialSub"),
  storeDialSub:$("storeDialSub"),
  metaDialSub:$("metaDialSub")
};

let currentUser = null;
let currentProfile = null;
let realtimeChannel = null;

/* =========================================================
   FORMATTERS
========================================================= */

function money(cents = 0){
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function shortCount(value = 0){

  const n = Number(value || 0);

  if(n >= 1000000){
    return `${(n / 1000000).toFixed(1)}M`;
  }

  if(n >= 1000){
    return `${(n / 1000).toFixed(1)}K`;
  }

  return n.toLocaleString();
}

function text(value, fallback = ""){
  return (
    value === null ||
    value === undefined ||
    value === ""
  )
    ? fallback
    : value;
}

function getName(profile, user){

  return (
    profile?.display_name ||
    profile?.username ||
    user?.email?.split("@")[0] ||
    "Rich Creator"
  );
}

function getInitial(name = "R"){
  return String(name || "R")
    .trim()
    .slice(0,1)
    .toUpperCase();
}

/* =========================================================
   PORTAL STATUS
========================================================= */

function setPortalStatus(status = "LIVE"){

  if(!els.portalStatus) return;

  els.portalStatus.textContent = status;

  els.portalStatus.classList.remove(
    "online",
    "offline",
    "syncing"
  );

  if(status === "LIVE"){
    els.portalStatus.classList.add("online");
  }

  if(status === "SYNC"){
    els.portalStatus.classList.add("syncing");
  }

  if(status === "OFFLINE"){
    els.portalStatus.classList.add("offline");
  }
}

/* =========================================================
   PROFILE RENDER
========================================================= */

function renderProfile(){

  if(!els.homeUserName) return;

  const name = getName(currentProfile, currentUser);

  const richLevel = text(
    currentProfile?.rich_level,
    "MAX"
  ).toUpperCase();

  const rank = text(
    currentProfile?.rank_title,
    "BIZ LEGEND"
  ).toUpperCase();

  els.homeUserName.textContent = name;
  els.homeRichLevel.textContent = richLevel;
  els.homeBalance.textContent = money(
    currentProfile?.balance_cents || 0
  );

  els.homeRichPoints.textContent = shortCount(
    currentProfile?.rich_points || 0
  );

  els.homeRank.textContent = rank;

  if(currentProfile?.avatar_url){

    els.homeAvatar.innerHTML = `
      <img
        src="${currentProfile.avatar_url}"
        alt="Avatar"
      />
    `;

  }else{

    els.homeAvatar.textContent = getInitial(name);

  }

  if(currentUser){
    els.welcomeStatus.textContent = "WELCOME BACK";
  }else{
    els.welcomeStatus.textContent = "WELCOME";
  }
}

/* =========================================================
   LOAD USER
========================================================= */

async function loadUserAndProfile(){

  const { data } =
    await supabase.auth.getUser();

  currentUser = data?.user || null;

  if(!currentUser){

    els.welcomeStatus.textContent = "TAP IN 💰";
    els.homeUserName.textContent = "Rich Guest";
    els.homeRichLevel.textContent = "GUEST";

    els.homeAvatar.textContent = "R";

    els.homeBalance.textContent = "$0.00";
    els.homeRichPoints.textContent = "0";
    els.homeRank.textContent = "VISITOR";

    setPortalStatus("GUEST");

    return;
  }

  const { data:profile, error } =
    await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();

  if(error){

    console.warn(
      "Profile load failed:",
      error.message
    );

    setPortalStatus("PROFILE");

    return;
  }

  currentProfile = profile || null;

  renderProfile();

  await supabase
    .from("profiles")
    .update({
      online_status:"online",
      last_seen_at:new Date().toISOString()
    })
    .eq("id", currentUser.id);
}

/* =========================================================
   COUNTERS
========================================================= */

async function countRows(
  table,
  filterBuilder = null
){

  try{

    let query = supabase
      .from(table)
      .select("id", {
        count:"exact",
        head:true
      });

    if(filterBuilder){
      query = filterBuilder(query);
    }

    const { count, error } = await query;

    if(error){
      console.warn(
        `Count failed ${table}:`,
        error.message
      );

      return 0;
    }

    return count || 0;

  }catch(err){

    console.warn(
      `Count crashed ${table}:`,
      err.message
    );

    return 0;
  }
}

/* =========================================================
   REALTIME HUB STATS
========================================================= */

async function loadHubStats(){

  setPortalStatus("SYNC");

  const [
    liveCount,
    musicCount,
    gameCount,
    sportsCount,
    galleryCount,
    uploadCount,
    storeCount,
    metaVisits,
    onlineUsers,
    unreadNotifications
  ] = await Promise.all([

    countRows(
      "live_streams",
      (q) => q.eq("status", "live")
    ),

    countRows("music_tracks"),

    countRows("game_scores"),

    countRows("sports_posts"),

    countRows("gallery_views"),

    countRows("uploads"),

    countRows("products"),

    countRows("meta_visits"),

    countRows(
      "profiles",
      (q) => q.eq("online_status", "online")
    ),

    currentUser
      ? countRows(
          "notifications",
          (q) =>
            q
              .eq("user_id", currentUser.id)
              .eq("is_read", false)
        )
      : 0
  ]);

  /* ========= DIAL LABELS ========= */

  els.liveDialSub.textContent =
    liveCount
      ? `${shortCount(liveCount)} LIVE`
      : "STREAM";

  els.musicDialSub.textContent =
    musicCount
      ? `${shortCount(musicCount)} TRACKS`
      : "VIBES";

  els.gamingDialSub.textContent =
    gameCount
      ? `${shortCount(gameCount)} SCORES`
      : "PLAY";

  els.sportsDialSub.textContent =
    sportsCount
      ? `${shortCount(sportsCount)} POSTS`
      : "HIGHLIGHTS";

  els.galleryDialSub.textContent =
    galleryCount
      ? `${shortCount(galleryCount)} DROPS`
      : "PHOTOS";

  els.uploadDialSub.textContent =
    uploadCount
      ? `${shortCount(uploadCount)} FILES`
      : "CONTENT";

  els.storeDialSub.textContent =
    storeCount
      ? `${shortCount(storeCount)} ITEMS`
      : "SHOP";

  els.metaDialSub.textContent =
    metaVisits
      ? `${shortCount(metaVisits)} VISITS`
      : "VERSE";

  /* ========= FOOTER ========= */

  els.homeOnline.textContent =
    shortCount(onlineUsers);

  /* ========= NOTIFICATIONS ========= */

  if(unreadNotifications > 0){

    els.notificationBtn?.classList.add(
      "has-unread"
    );

    els.notificationBtn?.setAttribute(
      "data-count",
      unreadNotifications
    );

  }else{

    els.notificationBtn?.classList.remove(
      "has-unread"
    );

    els.notificationBtn?.removeAttribute(
      "data-count"
    );
  }

  setPortalStatus("LIVE");
}

/* =========================================================
   REALTIME SYSTEM
========================================================= */

function startRealtime(){

  if(realtimeChannel){
    supabase.removeChannel(realtimeChannel);
  }

  realtimeChannel = supabase
    .channel("rb-omni-live-index")

    .on(
      "postgres_changes",
      {
        event:"*",
        schema:"public",
        table:"profiles"
      },
      async(payload) => {

        if(
          payload.new?.id === currentUser?.id
        ){
          currentProfile = payload.new;
          renderProfile();
        }

        await loadHubStats();
      }
    )

    .on(
      "postgres_changes",
      {
        event:"*",
        schema:"public",
        table:"live_streams"
      },
      loadHubStats
    )

    .on(
      "postgres_changes",
      {
        event:"*",
        schema:"public",
        table:"music_tracks"
      },
      loadHubStats
    )

    .on(
      "postgres_changes",
      {
        event:"*",
        schema:"public",
        table:"sports_posts"
      },
      loadHubStats
    )

    .on(
      "postgres_changes",
      {
        event:"*",
        schema:"public",
        table:"products"
      },
      loadHubStats
    )

    .on(
      "postgres_changes",
      {
        event:"*",
        schema:"public",
        table:"uploads"
      },
      loadHubStats
    )

    .on(
      "postgres_changes",
      {
        event:"*",
        schema:"public",
        table:"notifications"
      },
      loadHubStats
    )

    .subscribe((status) => {

      if(status === "SUBSCRIBED"){

        setPortalStatus("LIVE");

        document.body.classList.add(
          "realtime-connected"
        );
      }
    });
}

/* =========================================================
   ONLINE PRESENCE
========================================================= */

window.addEventListener(
  "beforeunload",
  async() => {

    if(!currentUser) return;

    try{

      await supabase
        .from("profiles")
        .update({
          online_status:"away",
          last_seen_at:new Date().toISOString()
        })
        .eq("id", currentUser.id);

    }catch(err){

      console.warn(
        "Presence shutdown:",
        err.message
      );
    }
  }
);

/* =========================================================
   UI FX
========================================================= */

function startCinemaFx(){

  let glow = false;

  setInterval(() => {

    glow = !glow;

    document.body.classList.toggle(
      "is-live",
      glow
    );

  }, 2400);
}

/* =========================================================
   BOOT
========================================================= */

async function bootIndex(){

  setPortalStatus("BOOT");

  await loadUserAndProfile();

  await loadHubStats();

  startRealtime();

  startCinemaFx();

  if(els.activateMain){
    els.activateMain.textContent =
      "ACTIVATE";
  }

  if(els.activateSub){
    els.activateSub.textContent =
      "ENTER LIVE";
  }

  console.log(
    "RICH BIZNESS LLC — CINEMA INDEX READY"
  );
}

bootIndex();
