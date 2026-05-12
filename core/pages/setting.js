import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================
   RICH BIZNESS MOBILE SETTINGS
   /core/pages/setting.js
   Realtime Account + App Settings
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
  accountVisibilityInput: $("accountVisibilityInput"),
  onlineStatusInput: $("onlineStatusInput"),
  defaultUploadSectionInput: $("defaultUploadSectionInput"),
  startPageInput: $("startPageInput"),

  notifyEngagementInput: $("notifyEngagementInput"),
  notifyMessagesInput: $("notifyMessagesInput"),
  notifyLiveInput: $("notifyLiveInput"),
  notifyStoreInput: $("notifyStoreInput"),

  showPresenceInput: $("showPresenceInput"),
  allowDiscoveryInput: $("allowDiscoveryInput"),
  allowMessagesInput: $("allowMessagesInput"),
  autoSyncAvatarInput: $("autoSyncAvatarInput"),

  appThemeInput: $("appThemeInput"),
  motionLevelInput: $("motionLevelInput"),

  saveSettingsBtn: $("saveSettingsBtn"),
  resetSettingsBtn: $("resetSettingsBtn"),
  settingsStatus: $("settingsStatus")
};

let currentUser = null;
let currentProfile = null;
let currentMetaAvatar = null;
let settingsChannel = null;

const DEFAULT_SETTINGS = {
  account_visibility: "public",
  online_status: "online",
  default_upload_section: "general",
  start_page: "/profile.html",
  notifications: {
    engagement: true,
    messages: true,
    live: true,
    store: true
  },
  privacy: {
    show_presence: true,
    allow_discovery: true,
    allow_messages: true,
    auto_sync_avatar: true
  },
  app: {
    theme: "rich_green",
    motion_level: "full"
  }
};

function setStatus(message) {
  if (els.settingsStatus) els.settingsStatus.textContent = message || "";
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function getProfileMeta() {
  return safeObject(currentProfile?.metadata);
}

function getSettings() {
  return {
    ...DEFAULT_SETTINGS,
    ...safeObject(getProfileMeta().settings),
    notifications: {
      ...DEFAULT_SETTINGS.notifications,
      ...safeObject(getProfileMeta().settings?.notifications)
    },
    privacy: {
      ...DEFAULT_SETTINGS.privacy,
      ...safeObject(getProfileMeta().settings?.privacy)
    },
    app: {
      ...DEFAULT_SETTINGS.app,
      ...safeObject(getProfileMeta().settings?.app)
    }
  };
}

function getName() {
  return (
    currentProfile?.display_name ||
    currentProfile?.username ||
    currentUser?.email?.split("@")[0] ||
    "Rich Creator"
  );
}

function getUsername() {
  return (
    currentProfile?.username ||
    currentUser?.email?.split("@")[0] ||
    "creator"
  );
}

function readFormSettings() {
  return {
    account_visibility: els.accountVisibilityInput?.value || "public",
    online_status: els.onlineStatusInput?.value || "online",
    default_upload_section: els.defaultUploadSectionInput?.value || "general",
    start_page: els.startPageInput?.value || "/profile.html",
    notifications: {
      engagement: Boolean(els.notifyEngagementInput?.checked),
      messages: Boolean(els.notifyMessagesInput?.checked),
      live: Boolean(els.notifyLiveInput?.checked),
      store: Boolean(els.notifyStoreInput?.checked)
    },
    privacy: {
      show_presence: Boolean(els.showPresenceInput?.checked),
      allow_discovery: Boolean(els.allowDiscoveryInput?.checked),
      allow_messages: Boolean(els.allowMessagesInput?.checked),
      auto_sync_avatar: Boolean(els.autoSyncAvatarInput?.checked)
    },
    app: {
      theme: els.appThemeInput?.value || "rich_green",
      motion_level: els.motionLevelInput?.value || "full"
    },
    updated_from: "setting.html",
    updated_at: new Date().toISOString()
  };
}

function fillFormFromSettings() {
  const settings = getSettings();

  els.accountVisibilityInput.value = settings.account_visibility || "public";
  els.onlineStatusInput.value = settings.online_status || "online";
  els.defaultUploadSectionInput.value = settings.default_upload_section || "general";
  els.startPageInput.value = settings.start_page || "/profile.html";

  els.notifyEngagementInput.checked = settings.notifications.engagement !== false;
  els.notifyMessagesInput.checked = settings.notifications.messages !== false;
  els.notifyLiveInput.checked = settings.notifications.live !== false;
  els.notifyStoreInput.checked = settings.notifications.store !== false;

  els.showPresenceInput.checked = settings.privacy.show_presence !== false;
  els.allowDiscoveryInput.checked = settings.privacy.allow_discovery !== false;
  els.allowMessagesInput.checked = settings.privacy.allow_messages !== false;
  els.autoSyncAvatarInput.checked = settings.privacy.auto_sync_avatar !== false;

  els.appThemeInput.value = settings.app.theme || "rich_green";
  els.motionLevelInput.value = settings.app.motion_level || "full";

  applyLocalSettings(settings);
  broadcastIdentity();
}

function applyLocalSettings(settings = getSettings()) {
  document.documentElement.dataset.rbTheme = settings.app?.theme || "rich_green";
  document.documentElement.dataset.rbMotion = settings.app?.motion_level || "full";

  localStorage.setItem("rb_settings", JSON.stringify(settings));
  localStorage.setItem("rb_default_upload_section", settings.default_upload_section || "general");
  localStorage.setItem("rb_start_page", settings.start_page || "/profile.html");
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
    settings: getSettings(),
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
        source: "setting.html",
        app: "Rich Bizness Mobile",
        settings: DEFAULT_SETTINGS
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

async function saveSettings() {
  if (!currentUser || !currentProfile) return;

  const settings = readFormSettings();
  const metadata = {
    ...getProfileMeta(),
    settings
  };

  els.saveSettingsBtn.disabled = true;
  setStatus("SAVING SETTINGS LIVE...");

  const { data, error } = await supabase
    .from("profiles")
    .update({
      metadata,
      online_status: settings.privacy.show_presence ? settings.online_status : "invisible",
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", currentUser.id)
    .select("*")
    .single();

  if (error) {
    setStatus(`SAVE ERROR: ${error.message}`);
    els.saveSettingsBtn.disabled = false;
    return;
  }

  currentProfile = data;
  applyLocalSettings(settings);
  broadcastIdentity();

  if (settings.privacy.auto_sync_avatar && currentMetaAvatar) {
    await supabase
      .from("meta_avatars")
      .update({
        presence_state: settings.privacy.show_presence ? settings.online_status : "invisible",
        updated_at: new Date().toISOString()
      })
      .eq("user_id", currentUser.id);
  }

  setStatus("SETTINGS SAVED REALTIME");
  els.saveSettingsBtn.disabled = false;
}

function resetForm() {
  fillFormFromSettings();
  setStatus("SETTINGS FORM RESET");
}

function previewSettingsChange() {
  const settings = readFormSettings();
  applyLocalSettings(settings);
  setStatus("SETTINGS PREVIEW UPDATED");
}

function startRealtime() {
  if (!currentUser) return;

  if (settingsChannel) {
    supabase.removeChannel(settingsChannel);
  }

  settingsChannel = supabase
    .channel("rich-bizness-settings-realtime")
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
          fillFormFromSettings();
          setStatus("SETTINGS UPDATED LIVE");
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
          broadcastIdentity();
          setStatus("AVATAR SETTINGS SYNCED LIVE");
        }
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") setStatus("SETTINGS REALTIME CONNECTED");
    });
}

[
  "accountVisibilityInput",
  "onlineStatusInput",
  "defaultUploadSectionInput",
  "startPageInput",
  "notifyEngagementInput",
  "notifyMessagesInput",
  "notifyLiveInput",
  "notifyStoreInput",
  "showPresenceInput",
  "allowDiscoveryInput",
  "allowMessagesInput",
  "autoSyncAvatarInput",
  "appThemeInput",
  "motionLevelInput"
].forEach((key) => {
  els[key]?.addEventListener("change", previewSettingsChange);
});

els.saveSettingsBtn?.addEventListener("click", saveSettings);
els.resetSettingsBtn?.addEventListener("click", resetForm);

async function bootSettings() {
  setStatus("BOOTING SETTINGS...");

  const ok = await loadUser();
  if (!ok) return;

  await ensureProfile();
  await loadMetaAvatar();

  fillFormFromSettings();
  startRealtime();

  setStatus("SETTINGS READY");
}

bootSettings();
