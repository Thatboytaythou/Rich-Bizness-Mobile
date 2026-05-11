import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================
   RICH BIZNESS MOBILE META
   /core/pages/meta.js
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

const WORLD_SLUG = "rich-bizness-main-world";

const $ = (id) => document.getElementById(id);

const els = {
  statWorld: $("statWorld"),
  statVisits: $("statVisits"),
  statLevel: $("statLevel"),
  statStatus: $("statStatus"),

  avatarOrb: $("avatarOrb"),
  avatarName: $("avatarName"),
  avatarBio: $("avatarBio"),
  xpBar: $("xpBar"),

  metaStatus: $("metaStatus"),
  stageStatus: $("stageStatus"),
  metaPlayer: $("metaPlayer"),

  enterWorldBtn: $("enterWorldBtn"),
  levelUpBtn: $("levelUpBtn"),
  syncAvatarBtn: $("syncAvatarBtn"),
  exitWorldBtn: $("exitWorldBtn"),

  portalGrid: $("portalGrid"),
  visitorsList: $("visitorsList")
};

let currentUser = null;
let currentProfile = null;
let world = null;
let avatar = null;
let activeVisit = null;
let portals = [];
let visitors = [];
let realtimeChannel = null;

function setStatus(message, mode = "ready") {
  if (els.metaStatus) els.metaStatus.textContent = message || "";
  if (els.statStatus) els.statStatus.textContent = mode.toUpperCase();
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getInitial(value = "R") {
  return String(value || "R").trim().slice(0, 1).toUpperCase();
}

function profileName() {
  return (
    currentProfile?.username ||
    currentProfile?.display_name ||
    currentUser?.user_metadata?.username ||
    currentUser?.email?.split("@")[0] ||
    "Rich Avatar"
  );
}

function updateStats() {
  els.statWorld.textContent = world?.world_type?.replaceAll("_", " ").toUpperCase() || "MAIN";
  els.statVisits.textContent = Number(world?.visit_count || visitors.length || 0).toLocaleString();
  els.statLevel.textContent = Number(avatar?.level || 1).toLocaleString();
}

function renderAvatar() {
  const name = avatar?.display_name || profileName();
  const level = Number(avatar?.level || 1);
  const xp = Number(avatar?.xp || 0);
  const xpPercent = Math.max(8, Math.min(100, xp % 100));

  els.avatarName.textContent = name;
  els.avatarBio.textContent = `Level ${level} ${avatar?.rank || "new_world"} avatar · aura ${avatar?.aura || "green"}`;
  els.xpBar.style.width = `${xpPercent}%`;

  if (avatar?.avatar_url || currentProfile?.avatar_url) {
    els.avatarOrb.innerHTML = `<img src="${escapeHtml(avatar?.avatar_url || currentProfile?.avatar_url)}" alt="Meta avatar" />`;
    els.metaPlayer.innerHTML = `<img src="${escapeHtml(avatar?.avatar_url || currentProfile?.avatar_url)}" alt="Meta avatar" style="width:100%;height:100%;object-fit:cover;border-radius:32px;" />`;
  } else {
    const initial = getInitial(name);
    els.avatarOrb.textContent = initial;
    els.metaPlayer.textContent = initial;
  }

  updateStats();
}

function renderPortals() {
  if (!portals.length) {
    els.portalGrid.innerHTML = `<div class="empty">No portals found. Check meta_portals seed data.</div>`;
    return;
  }

  els.portalGrid.innerHTML = portals
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
    .map((portal) => `
      <a class="portal-card" href="${escapeHtml(portal.destination_url)}" data-portal="${escapeHtml(portal.id)}">
        <div>
          <span>${escapeHtml(portal.icon || "🌐")}</span>
          <strong>${escapeHtml(portal.title || "Meta Portal")}</strong>
          <small>${escapeHtml(portal.destination_type || "world")}</small>
        </div>
      </a>
    `)
    .join("");
}

function renderVisitors() {
  if (!visitors.length) {
    els.visitorsList.innerHTML = `<div class="empty">No visitors loaded yet.</div>`;
    return;
  }

  els.visitorsList.innerHTML = visitors.slice(0, 12).map((visit) => {
    const isMe = visit.user_id === currentUser?.id;

    return `
      <div class="visitor">
        <div class="visitor-avatar">${isMe ? getInitial(profileName()) : "◈"}</div>
        <div>
          <strong>${isMe ? escapeHtml(profileName()) : "Rich Visitor"}</strong>
          <small>${visit.exited_at ? "EXITED" : "INSIDE META"} · ${new Date(visit.entered_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</small>
        </div>
      </div>
    `;
  }).join("");
}

/* =========================
   AUTH + PROFILE
========================= */

async function loadUser() {
  const { data } = await supabase.auth.getUser();
  currentUser = data?.user || null;

  if (!currentUser) {
    setStatus("SIGN IN REQUIRED TO ENTER META", "locked");
    setTimeout(() => {
      window.location.href = "/auth.html";
    }, 700);
    return false;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("id", currentUser.id)
    .maybeSingle();

  currentProfile = profile || null;
  return true;
}

/* =========================
   LOAD WORLD
========================= */

async function loadWorld() {
  const { data, error } = await supabase
    .from("meta_worlds")
    .select("*")
    .eq("slug", WORLD_SLUG)
    .maybeSingle();

  if (error) {
    console.warn("Meta world load error:", error.message);
    setStatus(`WORLD ERROR: ${error.message}`, "error");
    return;
  }

  world = data || null;

  if (!world) {
    setStatus("MAIN WORLD NOT FOUND — RUN META SQL PART 1", "error");
    return;
  }

  els.stageStatus.textContent = world.status?.toUpperCase() || "ONLINE";
  updateStats();
}

async function loadPortals() {
  if (!world?.id) return;

  const { data, error } = await supabase
    .from("meta_portals")
    .select("*")
    .eq("world_id", world.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.warn("Portal load error:", error.message);
    els.portalGrid.innerHTML = `<div class="empty">Portals could not load. Check meta_portals RLS.</div>`;
    return;
  }

  portals = data || [];
  renderPortals();
}

async function loadVisitors() {
  if (!world?.id) return;

  const { data, error } = await supabase
    .from("meta_visits")
    .select("*")
    .eq("world_id", world.id)
    .order("entered_at", { ascending: false })
    .limit(40);

  if (error) {
    console.warn("Visitors load error:", error.message);
    visitors = [];
    renderVisitors();
    return;
  }

  visitors = data || [];
  renderVisitors();
  updateStats();
}

/* =========================
   AVATAR CORE
========================= */

async function loadOrCreateAvatar() {
  const { data, error } = await supabase
    .from("meta_avatars")
    .select("*")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.warn("Avatar load error:", error.message);
  }

  if (data) {
    avatar = data;
    renderAvatar();
    return;
  }

  const payload = {
    user_id: currentUser.id,
    display_name: profileName(),
    avatar_url: currentProfile?.avatar_url || null,
    aura: "green",
    rank: "new_world",
    level: 1,
    xp: 10,
    current_world_id: world?.id || null,
    position: { x: 0, y: 0, z: 0 },
    metadata: {
      source: "meta.html",
      created_from: "auto_boot"
    }
  };

  const { data: created, error: createError } = await supabase
    .from("meta_avatars")
    .insert(payload)
    .select("*")
    .single();

  if (createError) {
    setStatus(`AVATAR ERROR: ${createError.message}`, "error");
    return;
  }

  avatar = created;
  renderAvatar();
}

async function syncAvatar() {
  if (!avatar) return;

  setStatus("SYNCING AVATAR CORE...", "sync");

  const { data, error } = await supabase
    .from("meta_avatars")
    .update({
      display_name: profileName(),
      avatar_url: currentProfile?.avatar_url || avatar.avatar_url || null,
      current_world_id: world?.id || null,
      updated_at: new Date().toISOString(),
      metadata: {
        ...(avatar.metadata || {}),
        last_sync: new Date().toISOString()
      }
    })
    .eq("user_id", currentUser.id)
    .select("*")
    .single();

  if (error) {
    setStatus(`SYNC ERROR: ${error.message}`, "error");
    return;
  }

  avatar = data;
  renderAvatar();
  setStatus("AVATAR CORE SYNCED", "ready");
}

async function levelUpAvatar() {
  if (!avatar) return;

  const nextXp = Number(avatar.xp || 0) + 25;
  const nextLevel = Number(avatar.level || 1) + (nextXp >= Number(avatar.level || 1) * 100 ? 1 : 0);

  const { data, error } = await supabase
    .from("meta_avatars")
    .update({
      xp: nextXp,
      level: nextLevel,
      rank: nextLevel >= 10 ? "meta_legend" : nextLevel >= 5 ? "world_builder" : "new_world",
      updated_at: new Date().toISOString()
    })
    .eq("user_id", currentUser.id)
    .select("*")
    .single();

  if (error) {
    setStatus(`LEVEL ERROR: ${error.message}`, "error");
    return;
  }

  avatar = data;
  renderAvatar();
  setStatus("AVATAR LEVELED UP", "live");
}

/* =========================
   ENTER / EXIT WORLD
========================= */

async function enterWorld() {
  if (!world?.id) {
    setStatus("WORLD NOT READY", "error");
    return;
  }

  if (activeVisit && !activeVisit.exited_at) {
    setStatus("YOU ARE ALREADY INSIDE META", "live");
    return;
  }

  setStatus("ENTERING META WORLD...", "entering");

  const { data: visit, error } = await supabase
    .from("meta_visits")
    .insert({
      world_id: world.id,
      user_id: currentUser.id,
      metadata: {
        source: "meta.html",
        device: "mobile"
      }
    })
    .select("*")
    .single();

  if (error) {
    setStatus(`ENTER ERROR: ${error.message}`, "error");
    return;
  }

  activeVisit = visit;

  await supabase
    .from("meta_worlds")
    .update({
      visit_count: Number(world.visit_count || 0) + 1,
      updated_at: new Date().toISOString()
    })
    .eq("id", world.id);

  await syncAvatar();
  await loadWorld();
  await loadVisitors();

  els.stageStatus.textContent = "INSIDE";
  setStatus("YOU ENTERED THE META WORLD", "live");
}

async function exitWorld() {
  if (!activeVisit?.id) {
    setStatus("NO ACTIVE VISIT TO EXIT", "ready");
    return;
  }

  const { error } = await supabase
    .from("meta_visits")
    .update({
      exited_at: new Date().toISOString()
    })
    .eq("id", activeVisit.id)
    .eq("user_id", currentUser.id);

  if (error) {
    setStatus(`EXIT ERROR: ${error.message}`, "error");
    return;
  }

  activeVisit = null;
  els.stageStatus.textContent = "ONLINE";

  await loadVisitors();
  setStatus("YOU EXITED META WORLD", "ready");
}

/* =========================
   REALTIME
========================= */

function startRealtime() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }

  realtimeChannel = supabase
    .channel("rich-bizness-meta-world")
    .on("postgres_changes", { event: "*", schema: "public", table: "meta_worlds" }, async () => {
      await loadWorld();
      setStatus("WORLD UPDATED LIVE", "live");
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "meta_avatars" }, async () => {
      await loadOrCreateAvatar();
      setStatus("AVATARS UPDATED LIVE", "live");
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "meta_visits" }, async () => {
      await loadVisitors();
      setStatus("VISITORS UPDATED LIVE", "live");
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "meta_portals" }, async () => {
      await loadPortals();
      setStatus("PORTALS UPDATED LIVE", "live");
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setStatus("META REALTIME CONNECTED", "ready");
      }
    });
}

/* =========================
   EVENTS
========================= */

els.enterWorldBtn?.addEventListener("click", enterWorld);
els.exitWorldBtn?.addEventListener("click", exitWorld);
els.syncAvatarBtn?.addEventListener("click", syncAvatar);
els.levelUpBtn?.addEventListener("click", levelUpAvatar);

els.portalGrid?.addEventListener("click", async (event) => {
  const card = event.target.closest("[data-portal]");
  if (!card) return;

  if (!activeVisit) {
    await enterWorld();
  }
});

/* =========================
   BOOT
========================= */

async function bootMeta() {
  setStatus("BOOTING META WORLD...", "boot");

  const ok = await loadUser();
  if (!ok) return;

  await loadWorld();
  await loadOrCreateAvatar();
  await loadPortals();
  await loadVisitors();

  startRealtime();
  updateStats();

  setStatus("META WORLD READY", "ready");
}

bootMeta();
