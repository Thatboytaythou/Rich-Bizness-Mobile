import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================
   RICH BIZNESS MOBILE PROFILE
   /core/pages/profile.js
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
  profileBanner: $("profileBanner"),
  profileAvatar: $("profileAvatar"),
  profileName: $("profileName"),
  profileBio: $("profileBio"),
  profileTag: $("profileTag"),

  statLevel: $("statLevel"),
  statPoints: $("statPoints"),
  statRank: $("statRank"),
  statBalance: $("statBalance"),

  usernameInput: $("usernameInput"),
  displayNameInput: $("displayNameInput"),
  bioInput: $("bioInput"),
  avatarUrlInput: $("avatarUrlInput"),
  bannerUrlInput: $("bannerUrlInput"),

  saveProfileBtn: $("saveProfileBtn"),
  logoutBtn: $("logoutBtn"),
  profileStatus: $("profileStatus")
};

let currentUser = null;
let currentProfile = null;
let realtimeChannel = null;

function setStatus(message) {
  if (els.profileStatus) els.profileStatus.textContent = message || "";
}

function money(cents = 0) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function safeText(value, fallback = "") {
  return value === null || value === undefined || value === "" ? fallback : value;
}

function getName(profile, user) {
  return (
    profile?.display_name ||
    profile?.username ||
    user?.email?.split("@")[0] ||
    "Rich Creator"
  );
}

function getUsername(profile, user) {
  return (
    profile?.username ||
    user?.email?.split("@")[0] ||
    "creator"
  );
}

function getInitial(name = "R") {
  return String(name || "R").trim().slice(0, 1).toUpperCase();
}

function renderProfile() {
  if (!currentUser || !currentProfile) return;

  const name = getName(currentProfile, currentUser);
  const username = getUsername(currentProfile, currentUser);
  const bio = safeText(currentProfile.bio, "Building the Rich Bizness universe.");

  els.profileName.textContent = name;
  els.profileBio.textContent = bio;
  els.profileTag.textContent = `@${username}`;

  els.statLevel.textContent = safeText(currentProfile.rich_level, "MAX");
  els.statPoints.textContent = Number(currentProfile.rich_points || 0).toLocaleString();
  els.statRank.textContent = safeText(currentProfile.rank_title, "BIZ LEGEND");
  els.statBalance.textContent = money(currentProfile.balance_cents);

  if (currentProfile.avatar_url) {
    els.profileAvatar.innerHTML = `<img src="${currentProfile.avatar_url}" alt="Profile avatar" />`;
  } else {
    els.profileAvatar.textContent = getInitial(name);
  }

  if (currentProfile.banner_url) {
    els.profileBanner.innerHTML = `<img src="${currentProfile.banner_url}" alt="Profile banner" />`;
  } else {
    els.profileBanner.innerHTML = "";
  }

  els.usernameInput.value = username;
  els.displayNameInput.value = safeText(currentProfile.display_name, name);
  els.bioInput.value = safeText(currentProfile.bio, "");
  els.avatarUrlInput.value = safeText(currentProfile.avatar_url, "");
  els.bannerUrlInput.value = safeText(currentProfile.banner_url, "");
}

async function loadUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.warn("Auth error:", error);
  }

  currentUser = data?.user || null;

  if (!currentUser) {
    window.location.href = "/auth.html";
    return false;
  }

  return true;
}

async function ensureProfile() {
  if (!currentUser) return;

  const fallbackUsername =
    currentUser.user_metadata?.username ||
    currentUser.email?.split("@")[0] ||
    `creator_${currentUser.id.slice(0, 6)}`;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.error("Profile load error:", error);
    setStatus(`PROFILE ERROR: ${error.message}`);
    return;
  }

  if (data) {
    currentProfile = data;
    return;
  }

  const { data: created, error: createError } = await supabase
    .from("profiles")
    .insert({
      id: currentUser.id,
      username: fallbackUsername,
      display_name: fallbackUsername,
      bio: "Building the Rich Bizness universe.",
      rich_level: "MAX",
      rank_title: "BIZ LEGEND",
      rich_points: 0,
      balance_cents: 0,
      online_status: "online",
      last_seen_at: new Date().toISOString(),
      metadata: {
        source: "profile.html",
        app: "Rich Bizness Mobile"
      }
    })
    .select("*")
    .single();

  if (createError) {
    console.error("Profile create error:", createError);
    setStatus(`CREATE PROFILE ERROR: ${createError.message}`);
    return;
  }

  currentProfile = created;
}

async function saveProfile() {
  if (!currentUser) return;

  const username = els.usernameInput.value.trim();
  const displayName = els.displayNameInput.value.trim();
  const bio = els.bioInput.value.trim();
  const avatarUrl = els.avatarUrlInput.value.trim();
  const bannerUrl = els.bannerUrlInput.value.trim();

  if (!username) {
    setStatus("USERNAME REQUIRED");
    return;
  }

  els.saveProfileBtn.disabled = true;
  setStatus("SAVING PROFILE...");

  const { data, error } = await supabase
    .from("profiles")
    .update({
      username,
      display_name: displayName || username,
      bio: bio || null,
      avatar_url: avatarUrl || null,
      banner_url: bannerUrl || null,
      online_status: "online",
      last_seen_at: new Date().toISOString()
    })
    .eq("id", currentUser.id)
    .select("*")
    .single();

  if (error) {
    console.error("Save profile error:", error);
    setStatus(`SAVE ERROR: ${error.message}`);
    els.saveProfileBtn.disabled = false;
    return;
  }

  currentProfile = data;
  renderProfile();

  setStatus("PROFILE SAVED REALTIME");
  els.saveProfileBtn.disabled = false;
}

async function updatePresence() {
  if (!currentUser) return;

  await supabase
    .from("profiles")
    .update({
      online_status: "online",
      last_seen_at: new Date().toISOString()
    })
    .eq("id", currentUser.id);
}

function startRealtime() {
  if (!currentUser) return;

  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }

  realtimeChannel = supabase
    .channel("rich-bizness-profile-realtime")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "profiles",
        filter: `id=eq.${currentUser.id}`
      },
      async (payload) => {
        if (payload.new) {
          currentProfile = payload.new;
          renderProfile();
          setStatus("PROFILE UPDATED LIVE");
        }
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setStatus("PROFILE REALTIME CONNECTED");
      }
    });
}

async function logout() {
  await supabase.auth.signOut();
  window.location.href = "/auth.html";
}

els.saveProfileBtn?.addEventListener("click", saveProfile);
els.logoutBtn?.addEventListener("click", logout);

async function bootProfile() {
  setStatus("BOOTING PROFILE...");

  const ok = await loadUser();
  if (!ok) return;

  await ensureProfile();
  renderProfile();
  await updatePresence();
  startRealtime();

  setStatus("PROFILE READY");
}

bootProfile();
