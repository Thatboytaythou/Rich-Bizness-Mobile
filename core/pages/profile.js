import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================
   RICH BIZNESS MOBILE PROFILE
   /core/pages/profile.js
   Avatar + Banner Upload + Meta Sync
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

  avatarFileInput: $("avatarFileInput"),
  bannerFileInput: $("bannerFileInput"),
  uploadAvatarBtn: $("uploadAvatarBtn"),
  uploadBannerBtn: $("uploadBannerBtn"),
  syncMetaBtn: $("syncMetaBtn"),

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

function escapePath(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function renderProfile() {
  if (!currentUser || !currentProfile) return;

  const name = getName(currentProfile, currentUser);
  const username = getUsername(currentProfile, currentUser);
  const bio = safeText(currentProfile.bio, "Building the Rich Bizness universe.");

  els.profileName.textContent = name;
  els.profileBio.textContent = bio;
  els.profileTag.textContent = `@${username}`;

  els.statLevel.textContent = safeText(currentProfile.rich_level, "STARTER").toUpperCase();
  els.statPoints.textContent = Number(currentProfile.rich_points || 0).toLocaleString();
  els.statRank.textContent = safeText(currentProfile.rank_title, "NEW CREATOR").toUpperCase();
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

  if (error) console.warn("Auth error:", error.message);

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
      rich_level: "starter",
      rank_title: "new creator",
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
    setStatus(`CREATE PROFILE ERROR: ${createError.message}`);
    return;
  }

  currentProfile = created;
}

async function updateProfileFields(fields) {
  if (!currentUser) return null;

  const { data, error } = await supabase
    .from("profiles")
    .update({
      ...fields,
      online_status: "online",
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", currentUser.id)
    .select("*")
    .single();

  if (error) {
    setStatus(`SAVE ERROR: ${error.message}`);
    return null;
  }

  currentProfile = data;
  renderProfile();
  return data;
}

async function uploadProfileFile(file, bucket, fieldName) {
  if (!file || !currentUser) return;

  if (!file.type.startsWith("image/")) {
    setStatus("IMAGE FILE ONLY FOR PROFILE MEDIA");
    return;
  }

  setStatus(`UPLOADING ${fieldName === "avatar_url" ? "AVATAR" : "BANNER"}...`);

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeName = escapePath(file.name.replace(/\.[^/.]+$/, ""));
  const path = `${currentUser.id}/${Date.now()}-${safeName}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type
    });

  if (uploadError) {
    setStatus(`UPLOAD ERROR: ${uploadError.message}`);
    return;
  }

  const { data: publicData } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  const publicUrl = publicData?.publicUrl;

  if (!publicUrl) {
    setStatus("PUBLIC URL ERROR");
    return;
  }

  if (fieldName === "avatar_url") {
    els.avatarUrlInput.value = publicUrl;
  }

  if (fieldName === "banner_url") {
    els.bannerUrlInput.value = publicUrl;
  }

  await updateProfileFields({
    [fieldName]: publicUrl
  });

  if (fieldName === "avatar_url") {
    await syncMetaAvatar(false);
  }

  setStatus(`${fieldName === "avatar_url" ? "AVATAR" : "BANNER"} UPLOADED REALTIME`);
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

  const data = await updateProfileFields({
    username,
    display_name: displayName || username,
    bio: bio || null,
    avatar_url: avatarUrl || null,
    banner_url: bannerUrl || null
  });

  if (data) {
    await syncMetaAvatar(false);
    setStatus("PROFILE SAVED + META SYNCED");
  }

  els.saveProfileBtn.disabled = false;
}

async function syncMetaAvatar(showStatus = true) {
  if (!currentUser || !currentProfile) return;

  if (showStatus) setStatus("SYNCING TO META AVATAR...");

  const payload = {
    user_id: currentUser.id,
    display_name: getName(currentProfile, currentUser),
    avatar_url: currentProfile.avatar_url || null,
    aura: "green",
    rank: currentProfile.rank_title || "new creator",
    level: Number(currentProfile.rich_points || 0) >= 100 ? 2 : 1,
    xp: Number(currentProfile.rich_points || 0),
    metadata: {
      source: "profile.html",
      synced_at: new Date().toISOString()
    },
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from("meta_avatars")
    .upsert(payload, { onConflict: "user_id" });

  if (error) {
    setStatus(`META SYNC ERROR: ${error.message}`);
    return;
  }

  if (showStatus) setStatus("META AVATAR SYNCED");
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
  await supabase
    .from("profiles")
    .update({
      online_status: "offline",
      last_seen_at: new Date().toISOString()
    })
    .eq("id", currentUser.id);

  await supabase.auth.signOut();
  window.location.href = "/auth.html";
}

els.uploadAvatarBtn?.addEventListener("click", () => els.avatarFileInput?.click());
els.uploadBannerBtn?.addEventListener("click", () => els.bannerFileInput?.click());

els.avatarFileInput?.addEventListener("change", async () => {
  const file = els.avatarFileInput.files?.[0];
  await uploadProfileFile(file, "avatars", "avatar_url");
  els.avatarFileInput.value = "";
});

els.bannerFileInput?.addEventListener("change", async () => {
  const file = els.bannerFileInput.files?.[0];
  await uploadProfileFile(file, "profile-banners", "banner_url");
  els.bannerFileInput.value = "";
});

els.syncMetaBtn?.addEventListener("click", () => syncMetaAvatar(true));
els.saveProfileBtn?.addEventListener("click", saveProfile);
els.logoutBtn?.addEventListener("click", logout);

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

async function bootProfile() {
  setStatus("BOOTING PROFILE...");

  const ok = await loadUser();
  if (!ok) return;

  await ensureProfile();
  renderProfile();
  await updatePresence();
  await syncMetaAvatar(false);

  startRealtime();

  setStatus("PROFILE READY");
}

bootProfile();
