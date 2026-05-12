import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================
   RICH BIZNESS MOBILE EDIT
   /core/pages/edit.js
   Realtime Identity Editor
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
  editAvatarPreview: $("editAvatarPreview"),
  editNamePreview: $("editNamePreview"),
  editUsernamePreview: $("editUsernamePreview"),
  editBioPreview: $("editBioPreview"),

  usernameInput: $("usernameInput"),
  displayNameInput: $("displayNameInput"),
  bioInput: $("bioInput"),
  profileTitleInput: $("profileTitleInput"),
  locationInput: $("locationInput"),

  instagramInput: $("instagramInput"),
  youtubeInput: $("youtubeInput"),
  musicLinkInput: $("musicLinkInput"),
  websiteInput: $("websiteInput"),

  avatarUrlInput: $("avatarUrlInput"),
  bannerUrlInput: $("bannerUrlInput"),
  profileThemeInput: $("profileThemeInput"),
  visibilityInput: $("visibilityInput"),

  primarySectionInput: $("primarySectionInput"),
  creatorTypeInput: $("creatorTypeInput"),
  statusMessageInput: $("statusMessageInput"),

  saveEditBtn: $("saveEditBtn"),
  resetEditBtn: $("resetEditBtn"),
  editStatus: $("editStatus")
};

let currentUser = null;
let currentProfile = null;
let currentMetaAvatar = null;
let profileChannel = null;

function setStatus(message) {
  if (els.editStatus) els.editStatus.textContent = message || "";
}

function safeText(value, fallback = "") {
  return value === null || value === undefined || value === "" ? fallback : value;
}

function cleanText(value = "") {
  return String(value || "").trim();
}

function cleanUrl(value = "") {
  const url = String(value || "").trim();
  return url || null;
}

function getProfileMeta() {
  return currentProfile?.metadata && typeof currentProfile.metadata === "object"
    ? currentProfile.metadata
    : {};
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

function getFormPayload() {
  const username = cleanText(els.usernameInput?.value);
  const displayName = cleanText(els.displayNameInput?.value);
  const bio = cleanText(els.bioInput?.value);

  const metadata = {
    ...getProfileMeta(),
    profile_title: cleanText(els.profileTitleInput?.value),
    location: cleanText(els.locationInput?.value),
    links: {
      instagram: cleanUrl(els.instagramInput?.value),
      youtube: cleanUrl(els.youtubeInput?.value),
      music: cleanUrl(els.musicLinkInput?.value),
      website: cleanUrl(els.websiteInput?.value)
    },
    profile_theme: els.profileThemeInput?.value || "rich_green",
    visibility: els.visibilityInput?.value || "public",
    primary_section: els.primarySectionInput?.value || "feed",
    creator_type: els.creatorTypeInput?.value || "creator",
    status_message: cleanText(els.statusMessageInput?.value),
    edited_from: "edit.html",
    edited_at: new Date().toISOString()
  };

  return {
    username,
    display_name: displayName || username,
    bio: bio || null,
    avatar_url: cleanUrl(els.avatarUrlInput?.value),
    banner_url: cleanUrl(els.bannerUrlInput?.value),
    metadata
  };
}

function renderPreviewFromForm() {
  const username = cleanText(els.usernameInput?.value) || getUsername();
  const name = cleanText(els.displayNameInput?.value) || username || "Rich Creator";
  const bio = cleanText(els.bioInput?.value) || "Building the Rich Bizness universe.";
  const avatarUrl =
    cleanUrl(els.avatarUrlInput?.value) ||
    currentProfile?.avatar_url ||
    currentMetaAvatar?.avatar_url ||
    null;

  if (els.editNamePreview) els.editNamePreview.textContent = name;
  if (els.editUsernamePreview) els.editUsernamePreview.textContent = `@${username}`;
  if (els.editBioPreview) els.editBioPreview.textContent = bio;

  if (els.editAvatarPreview) {
    if (avatarUrl) {
      els.editAvatarPreview.innerHTML = `<img src="${escapeHtml(avatarUrl)}" alt="Avatar preview" />`;
    } else {
      els.editAvatarPreview.textContent = getInitial(name);
    }
  }
}

function fillFormFromProfile() {
  if (!currentProfile) return;

  const meta = getProfileMeta();
  const links = meta.links || {};

  els.usernameInput.value = getUsername();
  els.displayNameInput.value = safeText(currentProfile.display_name, getName());
  els.bioInput.value = safeText(currentProfile.bio, "");

  els.profileTitleInput.value = safeText(meta.profile_title, "");
  els.locationInput.value = safeText(meta.location, "");

  els.instagramInput.value = safeText(links.instagram, "");
  els.youtubeInput.value = safeText(links.youtube, "");
  els.musicLinkInput.value = safeText(links.music, "");
  els.websiteInput.value = safeText(links.website, "");

  els.avatarUrlInput.value = safeText(currentProfile.avatar_url, "");
  els.bannerUrlInput.value = safeText(currentProfile.banner_url, "");

  els.profileThemeInput.value = safeText(meta.profile_theme, "rich_green");
  els.visibilityInput.value = safeText(meta.visibility, "public");
  els.primarySectionInput.value = safeText(meta.primary_section, "feed");
  els.creatorTypeInput.value = safeText(meta.creator_type, "creator");
  els.statusMessageInput.value = safeText(meta.status_message, "");

  renderPreviewFromForm();
  broadcastIdentity();
}

function getIdentityPayload() {
  if (!currentUser || !currentProfile) return null;

  return {
    user_id: currentUser.id,
    username: getUsername(),
    display_name: getName(),
    bio: currentProfile.bio || "",
    avatar_url: currentProfile.avatar_url || currentMetaAvatar?.avatar_url || null,
    banner_url: currentProfile.banner_url || null,
    online_status: currentProfile.online_status || "online",
    rich_level: currentProfile.rich_level || "starter",
    rank_title: currentProfile.rank_title || "new creator",
    rich_points: Number(currentProfile.rich_points || 0),
    metadata: getProfileMeta(),
    meta_avatar: currentMetaAvatar || null,
    updated_at: new Date().toISOString()
  };
}

function broadcastIdentity() {
  const payload = getIdentityPayload();
  if (!payload) return;

  localStorage.setItem("rb_current_identity", JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent("rb:identity-updated", { detail: payload }));
}

async function loadUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    setStatus(`AUTH ERROR: ${error.message}`);
    return false;
  }

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
    setStatus(`PROFILE LOAD ERROR: ${error.message}`);
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
        source: "edit.html",
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

async function loadMetaAvatar() {
  if (!currentUser) return null;

  const { data, error } = await supabase
    .from("meta_avatars")
    .select("*")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.warn("Meta avatar load skipped:", error.message);
    return null;
  }

  currentMetaAvatar = data || null;
  return currentMetaAvatar;
}

async function saveEdits() {
  if (!currentUser) return;

  const payload = getFormPayload();

  if (!payload.username) {
    setStatus("USERNAME REQUIRED");
    return;
  }

  els.saveEditBtn.disabled = true;
  setStatus("SAVING EDITS LIVE...");

  const { data, error } = await supabase
    .from("profiles")
    .update({
      ...payload,
      online_status: "online",
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", currentUser.id)
    .select("*")
    .single();

  if (error) {
    setStatus(`SAVE ERROR: ${error.message}`);
    els.saveEditBtn.disabled = false;
    return;
  }

  currentProfile = data;
  fillFormFromProfile();
  broadcastIdentity();

  setStatus("EDITS SAVED REALTIME");
  els.saveEditBtn.disabled = false;
}

function resetForm() {
  fillFormFromProfile();
  setStatus("FORM RESET");
}

function startRealtime() {
  if (!currentUser) return;

  if (profileChannel) {
    supabase.removeChannel(profileChannel);
  }

  profileChannel = supabase
    .channel("rich-bizness-edit-realtime")
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
          fillFormFromProfile();
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
          renderPreviewFromForm();
          broadcastIdentity();
          setStatus("AVATAR SYNCED LIVE");
        }
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") setStatus("EDIT REALTIME CONNECTED");
    });
}

[
  "usernameInput",
  "displayNameInput",
  "bioInput",
  "profileTitleInput",
  "locationInput",
  "instagramInput",
  "youtubeInput",
  "musicLinkInput",
  "websiteInput",
  "avatarUrlInput",
  "bannerUrlInput",
  "profileThemeInput",
  "visibilityInput",
  "primarySectionInput",
  "creatorTypeInput",
  "statusMessageInput"
].forEach((key) => {
  els[key]?.addEventListener("input", renderPreviewFromForm);
  els[key]?.addEventListener("change", renderPreviewFromForm);
});

els.saveEditBtn?.addEventListener("click", saveEdits);
els.resetEditBtn?.addEventListener("click", resetForm);

async function bootEdit() {
  setStatus("BOOTING EDIT ENGINE...");

  const ok = await loadUser();
  if (!ok) return;

  await ensureProfile();
  await loadMetaAvatar();

  fillFormFromProfile();
  startRealtime();

  setStatus("EDIT ENGINE READY");
}

bootEdit();
