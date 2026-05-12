import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================
   RICH BIZNESS MOBILE PROFILE
   /core/pages/profile.js
   Identity Engine + Real Meta Avatar Sync
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
  presenceTag: $("presenceTag"),

  statLevel: $("statLevel"),
  statPoints: $("statPoints"),
  statRank: $("statRank"),
  statBalance: $("statBalance"),

  auraRing: $("auraRing"),
  metaAvatarPreview: $("metaAvatarPreview"),
  avatarType: $("avatarType"),
  avatarMotion: $("avatarMotion"),
  avatarEmote: $("avatarEmote"),

  avatarFileInput: $("avatarFileInput"),
  bannerFileInput: $("bannerFileInput"),
  modelFileInput: $("modelFileInput"),
  uploadAvatarBtn: $("uploadAvatarBtn"),
  uploadBannerBtn: $("uploadBannerBtn"),
  uploadModelBtn: $("uploadModelBtn"),
  syncMetaBtn: $("syncMetaBtn"),

  usernameInput: $("usernameInput"),
  displayNameInput: $("displayNameInput"),
  bioInput: $("bioInput"),
  auraInput: $("auraInput"),
  motionInput: $("motionInput"),
  emoteInput: $("emoteInput"),
  themeInput: $("themeInput"),
  avatarUrlInput: $("avatarUrlInput"),
  bannerUrlInput: $("bannerUrlInput"),
  modelUrlInput: $("modelUrlInput"),

  saveProfileBtn: $("saveProfileBtn"),
  logoutBtn: $("logoutBtn"),
  profileStatus: $("profileStatus")
};

let currentUser = null;
let currentProfile = null;
let currentMetaAvatar = null;
let realtimeChannel = null;
let presenceTimer = null;

const DEFAULT_META = {
  avatar_type: "3d",
  aura: "green",
  rank: "new creator",
  level: 1,
  xp: 0,
  idle_animation: "idle_breathe",
  motion_state: "idle_breathe",
  emote: "neutral",
  theme: "rich_green",
  presence_state: "online",
  outfit: {},
  equipped_items: [],
  equipped_effects: [],
  position: {},
  metadata: {}
};

function setStatus(message) {
  if (els.profileStatus) els.profileStatus.textContent = message || "";
}

function money(cents = 0) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function safeText(value, fallback = "") {
  return value === null || value === undefined || value === "" ? fallback : value;
}

function getName(profile = currentProfile, user = currentUser) {
  return (
    profile?.display_name ||
    profile?.username ||
    user?.email?.split("@")[0] ||
    "Rich Creator"
  );
}

function getUsername(profile = currentProfile, user = currentUser) {
  return (
    profile?.username ||
    user?.email?.split("@")[0] ||
    "creator"
  );
}

function getInitial(name = "R") {
  return String(name || "R").trim().slice(0, 1).toUpperCase();
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapePath(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function cleanUrl(value = "") {
  const url = String(value || "").trim();
  return url || null;
}

function getMetaValue(key) {
  return currentMetaAvatar?.[key] ?? DEFAULT_META[key];
}

function buildMetaPayload(extra = {}) {
  const richPoints = Number(currentProfile?.rich_points || 0);
  const level = Number(currentMetaAvatar?.level || Math.max(1, Math.floor(richPoints / 100) + 1));

  return {
    user_id: currentUser.id,
    display_name: getName(),
    avatar_url: cleanUrl(els.avatarUrlInput?.value) || currentProfile?.avatar_url || null,
    model_url: cleanUrl(els.modelUrlInput?.value) || currentMetaAvatar?.model_url || null,

    avatar_type: currentMetaAvatar?.avatar_type || "3d",
    aura: els.auraInput?.value || currentMetaAvatar?.aura || "green",
    rank: currentProfile?.rank_title || currentMetaAvatar?.rank || "new creator",
    level,
    xp: richPoints,

    idle_animation: els.motionInput?.value || currentMetaAvatar?.idle_animation || "idle_breathe",
    motion_state: els.motionInput?.value || currentMetaAvatar?.motion_state || "idle_breathe",
    emote: els.emoteInput?.value || currentMetaAvatar?.emote || "neutral",
    theme: els.themeInput?.value || currentMetaAvatar?.theme || "rich_green",
    presence_state: "online",

    outfit: currentMetaAvatar?.outfit || {},
    equipped_items: currentMetaAvatar?.equipped_items || [],
    equipped_effects: currentMetaAvatar?.equipped_effects || [],
    position: currentMetaAvatar?.position || {},

    metadata: {
      ...(currentMetaAvatar?.metadata || {}),
      source: "profile.html",
      app: "Rich Bizness Mobile",
      synced_at: new Date().toISOString(),
      ...extra.metadata
    },

    updated_at: new Date().toISOString(),
    ...extra
  };
}

function renderProfile() {
  if (!currentUser || !currentProfile) return;

  const name = getName();
  const username = getUsername();
  const bio = safeText(currentProfile.bio, "Building the Rich Bizness universe.");
  const avatarUrl = currentProfile.avatar_url || currentMetaAvatar?.avatar_url || null;
  const bannerUrl = currentProfile.banner_url || null;

  els.profileName.textContent = name;
  els.profileBio.textContent = bio;
  els.profileTag.textContent = `@${username}`;

  if (els.presenceTag) {
    els.presenceTag.textContent = safeText(currentMetaAvatar?.presence_state, currentProfile.online_status || "online").toUpperCase();
  }

  els.statLevel.textContent = safeText(currentProfile.rich_level, "STARTER").toUpperCase();
  els.statPoints.textContent = Number(currentProfile.rich_points || 0).toLocaleString();
  els.statRank.textContent = safeText(currentProfile.rank_title, "NEW CREATOR").toUpperCase();
  els.statBalance.textContent = money(currentProfile.balance_cents);

  if (avatarUrl) {
    els.profileAvatar.innerHTML = `<img src="${escapeHtml(avatarUrl)}" alt="Profile avatar" />`;
  } else {
    els.profileAvatar.textContent = getInitial(name);
  }

  if (bannerUrl) {
    els.profileBanner.innerHTML = `<img src="${escapeHtml(bannerUrl)}" alt="Profile banner" />`;
  } else {
    els.profileBanner.innerHTML = "";
  }

  els.usernameInput.value = username;
  els.displayNameInput.value = safeText(currentProfile.display_name, name);
  els.bioInput.value = safeText(currentProfile.bio, "");
  els.avatarUrlInput.value = safeText(currentProfile.avatar_url, "");
  els.bannerUrlInput.value = safeText(currentProfile.banner_url, "");
  els.modelUrlInput.value = safeText(currentMetaAvatar?.model_url, "");

  els.auraInput.value = safeText(currentMetaAvatar?.aura, "green");
  els.motionInput.value = safeText(currentMetaAvatar?.motion_state || currentMetaAvatar?.idle_animation, "idle_breathe");
  els.emoteInput.value = safeText(currentMetaAvatar?.emote, "neutral");
  els.themeInput.value = safeText(currentMetaAvatar?.theme, "rich_green");

  renderMetaAvatar();
}

function renderMetaAvatar() {
  const name = getName();
  const avatarUrl = currentMetaAvatar?.avatar_url || currentProfile?.avatar_url || null;
  const aura = getMetaValue("aura");
  const motion = getMetaValue("motion_state") || getMetaValue("idle_animation");
  const emote = getMetaValue("emote");
  const avatarType = getMetaValue("avatar_type");

  if (avatarUrl) {
    els.metaAvatarPreview.innerHTML = `<img src="${escapeHtml(avatarUrl)}" alt="Digital avatar preview" />`;
  } else {
    els.metaAvatarPreview.textContent = getInitial(name);
  }

  els.avatarType.textContent = String(avatarType || "3d").toUpperCase();
  els.avatarMotion.textContent = String(motion || "idle").replaceAll("_", " ").toUpperCase();
  els.avatarEmote.textContent = String(emote || "neutral").replaceAll("_", " ").toUpperCase();

  if (els.auraRing) {
    const auraMap = {
      green: "rgba(157,255,103,.34)",
      gold: "rgba(255,219,123,.36)",
      smoke: "rgba(190,255,210,.22)",
      neon: "rgba(0,255,220,.34)"
    };

    const glow = auraMap[aura] || auraMap.green;
    els.auraRing.style.borderColor = glow;
    els.auraRing.style.boxShadow = `0 0 70px ${glow}`;
  }
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
  if (!currentUser) return null;

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
    return null;
  }

  if (data) {
    currentProfile = data;
    return data;
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
    return null;
  }

  currentProfile = created;
  return created;
}

async function ensureMetaAvatar() {
  if (!currentUser || !currentProfile) return null;

  const { data, error } = await supabase
    .from("meta_avatars")
    .select("*")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (error) {
    setStatus(`META LOAD ERROR: ${error.message}`);
    return null;
  }

  if (data) {
    currentMetaAvatar = data;
    return data;
  }

  const payload = {
    ...DEFAULT_META,
    user_id: currentUser.id,
    display_name: getName(),
    avatar_url: currentProfile.avatar_url || null,
    rank: currentProfile.rank_title || "new creator",
    xp: Number(currentProfile.rich_points || 0),
    level: Number(currentProfile.rich_points || 0) >= 100 ? 2 : 1,
    metadata: {
      source: "profile.html",
      created_from: "ensureMetaAvatar",
      created_at: new Date().toISOString()
    }
  };

  const { data: created, error: createError } = await supabase
    .from("meta_avatars")
    .insert(payload)
    .select("*")
    .single();

  if (createError) {
    setStatus(`CREATE META ERROR: ${createError.message}`);
    return null;
  }

  currentMetaAvatar = created;
  return created;
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

async function updateMetaAvatar(fields, showStatus = false) {
  if (!currentUser || !currentProfile) return null;

  if (showStatus) setStatus("SYNCING DIGITAL AVATAR...");

  const payload = buildMetaPayload(fields);

  const { data, error } = await supabase
    .from("meta_avatars")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) {
    setStatus(`META SYNC ERROR: ${error.message}`);
    return null;
  }

  currentMetaAvatar = data;
  renderProfile();

  if (showStatus) setStatus("DIGITAL AVATAR SYNCED");
  return data;
}

async function uploadFileToBucket(file, bucket, folder = "") {
  if (!file || !currentUser) return null;

  const ext = file.name.split(".").pop()?.toLowerCase() || "file";
  const safeName = escapePath(file.name.replace(/\.[^/.]+$/, "")) || "upload";
  const folderPath = folder ? `${folder}/` : "";
  const path = `${currentUser.id}/${folderPath}${Date.now()}-${safeName}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type || undefined
    });

  if (uploadError) {
    setStatus(`UPLOAD ERROR: ${uploadError.message}`);
    return null;
  }

  const { data: publicData } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return publicData?.publicUrl || null;
}

async function uploadProfileFile(file, bucket, fieldName) {
  if (!file || !currentUser) return;

  if (!file.type.startsWith("image/")) {
    setStatus("IMAGE FILE ONLY FOR PROFILE MEDIA");
    return;
  }

  setStatus(`UPLOADING ${fieldName === "avatar_url" ? "AVATAR" : "BANNER"}...`);

  const publicUrl = await uploadFileToBucket(file, bucket, "profile");

  if (!publicUrl) {
    setStatus("PUBLIC URL ERROR");
    return;
  }

  if (fieldName === "avatar_url") els.avatarUrlInput.value = publicUrl;
  if (fieldName === "banner_url") els.bannerUrlInput.value = publicUrl;

  const updated = await updateProfileFields({ [fieldName]: publicUrl });

  if (updated && fieldName === "avatar_url") {
    await updateMetaAvatar({
      avatar_url: publicUrl,
      metadata: {
        avatar_source: "profile_upload"
      }
    });
  }

  setStatus(`${fieldName === "avatar_url" ? "AVATAR" : "BANNER"} UPLOADED REALTIME`);
}

async function uploadModelFile(file) {
  if (!file || !currentUser) return;

  const allowed = /\.(glb|gltf|vrm|fbx|obj|usdz)$/i.test(file.name);

  if (!allowed) {
    setStatus("3D MODEL ONLY: GLB, GLTF, VRM, FBX, OBJ, USDZ");
    return;
  }

  setStatus("UPLOADING 3D AVATAR MODEL...");

  const publicUrl = await uploadFileToBucket(file, "meta-avatars", "models");

  if (!publicUrl) {
    setStatus("MODEL URL ERROR");
    return;
  }

  els.modelUrlInput.value = publicUrl;

  await updateMetaAvatar({
    avatar_type: "3d",
    model_url: publicUrl,
    metadata: {
      model_source: "profile_model_upload"
    }
  }, true);

  setStatus("3D MODEL UPLOADED + META AVATAR SYNCED");
}

async function saveProfile() {
  if (!currentUser) return;

  const username = els.usernameInput.value.trim();
  const displayName = els.displayNameInput.value.trim();
  const bio = els.bioInput.value.trim();
  const avatarUrl = els.avatarUrlInput.value.trim();
  const bannerUrl = els.bannerUrlInput.value.trim();
  const modelUrl = els.modelUrlInput.value.trim();

  if (!username) {
    setStatus("USERNAME REQUIRED");
    return;
  }

  els.saveProfileBtn.disabled = true;
  setStatus("SAVING IDENTITY...");

  const profileData = await updateProfileFields({
    username,
    display_name: displayName || username,
    bio: bio || null,
    avatar_url: avatarUrl || null,
    banner_url: bannerUrl || null
  });

  if (profileData) {
    await updateMetaAvatar({
      display_name: displayName || username,
      avatar_url: avatarUrl || null,
      model_url: modelUrl || null,
      aura: els.auraInput.value,
      idle_animation: els.motionInput.value,
      motion_state: els.motionInput.value,
      emote: els.emoteInput.value,
      theme: els.themeInput.value,
      presence_state: "online",
      metadata: {
        saved_from: "profile_save"
      }
    }, true);

    setStatus("IDENTITY SAVED + DIGITAL AVATAR LIVE");
  }

  els.saveProfileBtn.disabled = false;
}

async function syncMetaAvatar(showStatus = true) {
  await updateMetaAvatar({
    display_name: getName(),
    avatar_url: currentProfile?.avatar_url || cleanUrl(els.avatarUrlInput?.value) || null,
    model_url: cleanUrl(els.modelUrlInput?.value) || currentMetaAvatar?.model_url || null,
    aura: els.auraInput?.value || "green",
    idle_animation: els.motionInput?.value || "idle_breathe",
    motion_state: els.motionInput?.value || "idle_breathe",
    emote: els.emoteInput?.value || "neutral",
    theme: els.themeInput?.value || "rich_green",
    presence_state: "online",
    metadata: {
      manual_sync: showStatus
    }
  }, showStatus);
}

async function updatePresence(state = "online") {
  if (!currentUser) return;

  await supabase
    .from("profiles")
    .update({
      online_status: state,
      last_seen_at: new Date().toISOString()
    })
    .eq("id", currentUser.id);

  if (currentMetaAvatar) {
    await updateMetaAvatar({ presence_state: state });
  }
}

function startPresenceHeartbeat() {
  if (presenceTimer) clearInterval(presenceTimer);

  presenceTimer = setInterval(() => {
    updatePresence("online");
  }, 45000);
}

function startRealtime() {
  if (!currentUser) return;

  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }

  realtimeChannel = supabase
    .channel("rich-bizness-profile-identity-realtime")
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
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "meta_avatars",
        filter: `user_id=eq.${currentUser.id}`
      },
      async (payload) => {
        if (payload.new) {
          currentMetaAvatar = payload.new;
          renderProfile();
          setStatus("DIGITAL AVATAR UPDATED LIVE");
        }
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setStatus("IDENTITY REALTIME CONNECTED");
      }
    });
}

async function logout() {
  if (currentUser) {
    await updatePresence("offline");
  }

  await supabase.auth.signOut();
  window.location.href = "/auth.html";
}

els.uploadAvatarBtn?.addEventListener("click", () => els.avatarFileInput?.click());
els.uploadBannerBtn?.addEventListener("click", () => els.bannerFileInput?.click());
els.uploadModelBtn?.addEventListener("click", () => els.modelFileInput?.click());

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

els.modelFileInput?.addEventListener("change", async () => {
  const file = els.modelFileInput.files?.[0];
  await uploadModelFile(file);
  els.modelFileInput.value = "";
});

["auraInput", "motionInput", "emoteInput", "themeInput"].forEach((key) => {
  els[key]?.addEventListener("change", async () => {
    renderMetaAvatar();
    await syncMetaAvatar(false);
    setStatus("AVATAR STYLE UPDATED");
  });
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

  supabase
    .from("meta_avatars")
    .update({
      presence_state: "away",
      updated_at: new Date().toISOString()
    })
    .eq("user_id", currentUser.id);
});

async function bootProfile() {
  setStatus("BOOTING IDENTITY ENGINE...");

  const ok = await loadUser();
  if (!ok) return;

  await ensureProfile();
  await ensureMetaAvatar();
  renderProfile();

  await updatePresence("online");
  await syncMetaAvatar(false);

  startRealtime();
  startPresenceHeartbeat();

  setStatus("PROFILE IDENTITY ENGINE READY");
}

bootProfile();
