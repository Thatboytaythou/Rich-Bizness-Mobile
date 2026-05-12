import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================
   RICH BIZNESS MOBILE PROFILE
   /core/pages/profile.js
   Avatar Creator + Moving Avatar + Meta Sync
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
  metaModelViewer: $("metaModelViewer"),
  generatedAvatarPreview: $("generatedAvatarPreview"),
  avatarType: $("avatarType"),
  avatarMotion: $("avatarMotion"),
  avatarEmote: $("avatarEmote"),

  creatorBodyInput: $("creatorBodyInput"),
  creatorHairInput: $("creatorHairInput"),
  creatorOutfitInput: $("creatorOutfitInput"),
  creatorMotionInput: $("creatorMotionInput"),
  generateAvatarBtn: $("generateAvatarBtn"),

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

const DEFAULT_AVATAR_CONFIG = {
  body: "athletic",
  hair: "waves",
  outfit: "money",
  motion: "idle_breathe"
};

const DEFAULT_META = {
  avatar_type: "created",
  aura: "green",
  rank: "new creator",
  level: 1,
  xp: 0,
  idle_animation: "idle_breathe",
  motion_state: "idle_breathe",
  emote: "neutral",
  theme: "rich_green",
  presence_state: "online",
  outfit: DEFAULT_AVATAR_CONFIG,
  equipped_items: [],
  equipped_effects: [],
  position: {},
  metadata: {
    avatar_config: DEFAULT_AVATAR_CONFIG
  }
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
  return profile?.display_name || profile?.username || user?.email?.split("@")[0] || "Rich Creator";
}

function getUsername(profile = currentProfile, user = currentUser) {
  return profile?.username || user?.email?.split("@")[0] || "creator";
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

function getAvatarConfig() {
  return {
    ...DEFAULT_AVATAR_CONFIG,
    ...(currentMetaAvatar?.metadata?.avatar_config || {}),
    ...(currentMetaAvatar?.outfit || {})
  };
}

function getCreatorConfigFromInputs() {
  return {
    body: els.creatorBodyInput?.value || "athletic",
    hair: els.creatorHairInput?.value || "waves",
    outfit: els.creatorOutfitInput?.value || "money",
    motion: els.creatorMotionInput?.value || "idle_breathe"
  };
}

function avatarPromptFromConfig(config = getAvatarConfig()) {
  return [
    "Rich Bizness mobile avatar",
    `${config.body} body`,
    `${config.hair} hair`,
    `${config.outfit} outfit`,
    `${config.motion} motion`,
    `${els.auraInput?.value || "green"} aura`,
    `${els.themeInput?.value || "rich_green"} theme`,
    "Snapchat Bitmoji meets GTA 2K MyPlayer style",
    "premium futuristic streetwear metaverse character"
  ].join(", ");
}

function buildMetaPayload(extra = {}) {
  const richPoints = Number(currentProfile?.rich_points || 0);
  const config = extra.outfit || getAvatarConfig();
  const extraMetadata = extra.metadata || {};

  return {
    user_id: currentUser.id,
    display_name: getName(),
    avatar_url: cleanUrl(els.avatarUrlInput?.value) || currentProfile?.avatar_url || null,
    model_url: cleanUrl(els.modelUrlInput?.value) || currentMetaAvatar?.model_url || null,

    avatar_type: extra.avatar_type || currentMetaAvatar?.avatar_type || "created",
    aura: els.auraInput?.value || currentMetaAvatar?.aura || "green",
    rank: currentProfile?.rank_title || currentMetaAvatar?.rank || "new creator",
    level: Number(currentMetaAvatar?.level || Math.max(1, Math.floor(richPoints / 100) + 1)),
    xp: richPoints,

    idle_animation: config.motion || currentMetaAvatar?.idle_animation || "idle_breathe",
    motion_state: config.motion || currentMetaAvatar?.motion_state || "idle_breathe",
    emote: els.emoteInput?.value || currentMetaAvatar?.emote || "neutral",
    theme: els.themeInput?.value || currentMetaAvatar?.theme || "rich_green",
    presence_state: "online",

    outfit: config,
    equipped_items: currentMetaAvatar?.equipped_items || [],
    equipped_effects: currentMetaAvatar?.equipped_effects || [],
    position: currentMetaAvatar?.position || {},

    metadata: {
      ...(currentMetaAvatar?.metadata || {}),
      source: "profile.html",
      app: "Rich Bizness Mobile",
      avatar_config: config,
      avatar_prompt: avatarPromptFromConfig(config),
      synced_at: new Date().toISOString(),
      ...extraMetadata
    },

    updated_at: new Date().toISOString(),
    ...extra,
    metadata: {
      ...(currentMetaAvatar?.metadata || {}),
      source: "profile.html",
      app: "Rich Bizness Mobile",
      avatar_config: config,
      avatar_prompt: avatarPromptFromConfig(config),
      synced_at: new Date().toISOString(),
      ...extraMetadata
    }
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
    els.presenceTag.textContent = safeText(
      currentMetaAvatar?.presence_state,
      currentProfile.online_status || "online"
    ).toUpperCase();
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

  els.profileBanner.innerHTML = bannerUrl
    ? `<img src="${escapeHtml(bannerUrl)}" alt="Profile banner" />`
    : "";

  els.usernameInput.value = username;
  els.displayNameInput.value = safeText(currentProfile.display_name, name);
  els.bioInput.value = safeText(currentProfile.bio, "");
  els.avatarUrlInput.value = safeText(currentProfile.avatar_url, "");
  els.bannerUrlInput.value = safeText(currentProfile.banner_url, "");
  els.modelUrlInput.value = safeText(currentMetaAvatar?.model_url, "");

  els.auraInput.value = safeText(currentMetaAvatar?.aura, "green");
  els.emoteInput.value = safeText(currentMetaAvatar?.emote, "neutral");
  els.themeInput.value = safeText(currentMetaAvatar?.theme, "rich_green");

  syncCreatorInputsFromMeta();
  renderMetaAvatar();
}

function syncCreatorInputsFromMeta() {
  const config = getAvatarConfig();

  if (els.creatorBodyInput) els.creatorBodyInput.value = config.body || "athletic";
  if (els.creatorHairInput) els.creatorHairInput.value = config.hair || "waves";
  if (els.creatorOutfitInput) els.creatorOutfitInput.value = config.outfit || "money";
  if (els.creatorMotionInput) els.creatorMotionInput.value = config.motion || currentMetaAvatar?.motion_state || "idle_breathe";
}

function renderCreatedAvatar(config = getAvatarConfig()) {
  if (!els.generatedAvatarPreview) return;

  els.generatedAvatarPreview.dataset.body = config.body || "athletic";
  els.generatedAvatarPreview.dataset.hair = config.hair || "waves";
  els.generatedAvatarPreview.dataset.outfit = config.outfit || "money";
  els.generatedAvatarPreview.dataset.motion = config.motion || "idle_breathe";
  els.generatedAvatarPreview.style.display = "grid";
}

function renderMetaAvatar() {
  const modelUrl = cleanUrl(currentMetaAvatar?.model_url) || cleanUrl(els.modelUrlInput?.value);
  const aura = getMetaValue("aura");
  const motion = getMetaValue("motion_state") || getMetaValue("idle_animation");
  const emote = getMetaValue("emote");
  const config = getAvatarConfig();

  if (modelUrl && els.metaModelViewer) {
    els.metaModelViewer.src = modelUrl;
    els.metaModelViewer.style.display = "block";
    if (els.generatedAvatarPreview) els.generatedAvatarPreview.style.display = "none";
    els.avatarType.textContent = "3D MODEL";
  } else {
    if (els.metaModelViewer) {
      els.metaModelViewer.removeAttribute("src");
      els.metaModelViewer.style.display = "none";
    }

    renderCreatedAvatar(config);
    els.avatarType.textContent = "CREATED";
  }

  els.avatarMotion.textContent = String(config.motion || motion || "idle").replaceAll("_", " ").toUpperCase();
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
      avatar_config: DEFAULT_AVATAR_CONFIG,
      avatar_prompt: avatarPromptFromConfig(DEFAULT_AVATAR_CONFIG),
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

async function generateAvatar() {
  if (!currentUser) return;

  const config = getCreatorConfigFromInputs();

  renderCreatedAvatar(config);
  setStatus("GENERATING MOVING AVATAR...");

  await updateMetaAvatar({
    avatar_type: "created",
    model_url: null,
    outfit: config,
    idle_animation: config.motion,
    motion_state: config.motion,
    metadata: {
      avatar_config: config,
      avatar_prompt: avatarPromptFromConfig(config),
      generator: "rich_bizness_css_avatar_v1",
      generated_at: new Date().toISOString()
    }
  }, true);

  setStatus("MOVING AVATAR GENERATED + SAVED");
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

  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
  return publicData?.publicUrl || null;
}

async function uploadProfileFile(file, bucket, fieldName) {
  if (!file || !currentUser) return;

  if (!file.type.startsWith("image/")) {
    setStatus("IMAGE FILE ONLY FOR PROFILE MEDIA");
    return;
  }

  setStatus(`UPLOADING ${fieldName === "avatar_url" ? "AVATAR IMAGE" : "BANNER"}...`);

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
      metadata: { avatar_image_source: "profile_upload" }
    });
  }

  setStatus(`${fieldName === "avatar_url" ? "AVATAR IMAGE" : "BANNER"} UPLOADED REALTIME`);
}

async function uploadModelFile(file) {
  if (!file || !currentUser) return;

  const allowed = /\.(glb|gltf)$/i.test(file.name);

  if (!allowed) {
    setStatus("MODEL VIEWER NEEDS GLB OR GLTF FIRST");
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
    avatar_type: "3d_model",
    model_url: publicUrl,
    metadata: { model_source: "profile_model_upload" }
  }, true);

  setStatus("3D MODEL UPLOADED + LIVE PREVIEW ACTIVE");
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
    const config = getCreatorConfigFromInputs();

    await updateMetaAvatar({
      display_name: displayName || username,
      avatar_url: avatarUrl || null,
      model_url: modelUrl || null,
      avatar_type: modelUrl ? "3d_model" : "created",
      aura: els.auraInput.value,
      idle_animation: config.motion,
      motion_state: config.motion,
      emote: els.emoteInput.value,
      theme: els.themeInput.value,
      outfit: config,
      presence_state: "online",
      metadata: {
        saved_from: "profile_save",
        avatar_config: config,
        avatar_prompt: avatarPromptFromConfig(config)
      }
    }, true);

    setStatus("IDENTITY SAVED + MOVING AVATAR LIVE");
  }

  els.saveProfileBtn.disabled = false;
}

async function syncMetaAvatar(showStatus = true) {
  const config = getCreatorConfigFromInputs();

  await updateMetaAvatar({
    display_name: getName(),
    avatar_url: currentProfile?.avatar_url || cleanUrl(els.avatarUrlInput?.value) || null,
    model_url: cleanUrl(els.modelUrlInput?.value) || currentMetaAvatar?.model_url || null,
    avatar_type: cleanUrl(els.modelUrlInput?.value) ? "3d_model" : "created",
    aura: els.auraInput?.value || "green",
    idle_animation: config.motion,
    motion_state: config.motion,
    emote: els.emoteInput?.value || "neutral",
    theme: els.themeInput?.value || "rich_green",
    outfit: config,
    presence_state: "online",
    metadata: {
      manual_sync: showStatus,
      avatar_config: config,
      avatar_prompt: avatarPromptFromConfig(config)
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
  presenceTimer = setInterval(() => updatePresence("online"), 45000);
}

function startRealtime() {
  if (!currentUser) return;
  if (realtimeChannel) supabase.removeChannel(realtimeChannel);

  realtimeChannel = supabase
    .channel("rich-bizness-profile-identity-realtime")
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "profiles",
      filter: `id=eq.${currentUser.id}`
    }, async (payload) => {
      if (payload.new) {
        currentProfile = payload.new;
        renderProfile();
        setStatus("PROFILE UPDATED LIVE");
      }
    })
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "meta_avatars",
      filter: `user_id=eq.${currentUser.id}`
    }, async (payload) => {
      if (payload.new) {
        currentMetaAvatar = payload.new;
        renderProfile();
        setStatus("DIGITAL AVATAR UPDATED LIVE");
      }
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") setStatus("IDENTITY REALTIME CONNECTED");
    });
}

async function logout() {
  if (currentUser) await updatePresence("offline");
  await supabase.auth.signOut();
  window.location.href = "/auth.html";
}

els.generateAvatarBtn?.addEventListener("click", generateAvatar);

[
  "creatorBodyInput",
  "creatorHairInput",
  "creatorOutfitInput",
  "creatorMotionInput",
  "auraInput",
  "emoteInput",
  "themeInput"
].forEach((key) => {
  els[key]?.addEventListener("change", () => {
    const config = getCreatorConfigFromInputs();
    renderCreatedAvatar(config);
    renderMetaAvatar();
    setStatus("AVATAR PREVIEW UPDATED");
  });
});

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
  setStatus("BOOTING AVATAR CREATOR...");

  const ok = await loadUser();
  if (!ok) return;

  await ensureProfile();
  await ensureMetaAvatar();
  renderProfile();

  await updatePresence("online");
  await syncMetaAvatar(false);

  startRealtime();
  startPresenceHeartbeat();

  setStatus("PROFILE + MOVING AVATAR CREATOR READY");
}

bootProfile();
