import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================
   RICH BIZNESS MOBILE UPLOAD
   /core/pages/upload.js
   FULL CORRECTED TABLE + BUCKET ROUTER
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
  statUploads: $("statUploads"),
  statSection: $("statSection"),
  statType: $("statType"),
  statStatus: $("statStatus"),

  dropZone: $("dropZone"),
  fileInput: $("fileInput"),
  previewCard: $("previewCard"),
  previewSlot: $("previewSlot"),
  fileMeta: $("fileMeta"),

  progressWrap: $("progressWrap"),
  progressBar: $("progressBar"),

  sectionInput: $("sectionInput"),
  titleInput: $("titleInput"),
  categoryInput: $("categoryInput"),
  visibilityInput: $("visibilityInput"),
  descriptionInput: $("descriptionInput"),
  uploadBtn: $("uploadBtn"),
  uploadStatus: $("uploadStatus"),

  uploadCount: $("uploadCount"),
  uploadsList: $("uploadsList")
};

let currentUser = null;
let currentProfile = null;
let currentMetaAvatar = null;
let currentIdentity = null;
let selectedFile = null;
let uploads = [];
let realtimeChannel = null;

const ROUTES = {
  general: { bucket: "general-uploads", section: "general", category: "general" },

  feed: { bucket: "general-uploads", section: "feed", category: "feed" },

  "profile-avatar": { bucket: "avatars", section: "profile", category: "avatar" },
  "profile-banner": { bucket: "profile-banners", section: "profile", category: "banner" },

  music: { bucket: "music-audio", section: "music", category: "music" },
  "music-cover": { bucket: "music-covers", section: "music", category: "cover" },

  podcast: { bucket: "podcast-audio", section: "podcast", category: "podcast" },
  "podcast-cover": { bucket: "podcast-covers", section: "podcast", category: "cover" },

  radio: { bucket: "radio-covers", section: "radio", category: "cover" },

  gallery: { bucket: "gallery-media", section: "gallery", category: "gallery" },

  gaming: { bucket: "game-clips", section: "gaming", category: "gaming" },
  "game-cover": { bucket: "game-covers", section: "gaming", category: "cover" },
  "game-asset": { bucket: "game-assets", section: "gaming", category: "asset" },

  sports: { bucket: "sports-media", section: "sports", category: "sports" },
  "sports-clip": { bucket: "sports-clips", section: "sports", category: "clip" },
  "sports-cover": { bucket: "sports-covers", section: "sports", category: "cover" },

  "store-product": { bucket: "store-products", section: "store", category: "product" },
  "store-digital": { bucket: "store-digital", section: "store", category: "digital" },
  "store-seller": { bucket: "store-seller-media", section: "store", category: "seller" },

  "live-thumbnail": { bucket: "live-thumbnails", section: "live", category: "thumbnail" },
  "live-recording": { bucket: "live-recordings", section: "live", category: "recording" },

  "meta-avatar": { bucket: "meta-avatars", section: "meta", category: "avatar" }
};

function setStatus(message, mode = "idle") {
  if (els.uploadStatus) els.uploadStatus.textContent = message || "";
  if (els.statStatus) els.statStatus.textContent = String(mode || "idle").toUpperCase();
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatBytes(bytes = 0) {
  const size = Number(bytes || 0);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function safeFileName(name = "upload") {
  const parts = String(name).split(".");
  const ext = parts.length > 1 ? parts.pop().toLowerCase() : "file";
  const base = parts.join(".") || "upload";

  return `${base}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) + `.${ext}`;
}

function getMediaType(file = selectedFile) {
  const type = file?.type || "";
  const name = file?.name || "";

  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  if (type.includes("pdf") || /\.pdf$/i.test(name)) return "document";
  if (type.includes("zip") || /\.zip$/i.test(name)) return "archive";
  return "file";
}

function getRouteKey() {
  return els.sectionInput?.value || "general";
}

function getRoute() {
  return ROUTES[getRouteKey()] || ROUTES.general;
}

function getTitle() {
  return (
    els.titleInput?.value.trim() ||
    selectedFile?.name?.replace(/\.[^/.]+$/, "") ||
    "Rich Bizness Upload"
  );
}

function getUsername() {
  return (
    currentProfile?.username ||
    currentIdentity?.username ||
    currentUser?.email?.split("@")[0] ||
    "creator"
  );
}

function getDisplayName() {
  return (
    currentProfile?.display_name ||
    currentIdentity?.display_name ||
    getUsername()
  );
}

function getAvatarUrl() {
  return (
    currentProfile?.avatar_url ||
    currentIdentity?.avatar_url ||
    currentMetaAvatar?.avatar_url ||
    null
  );
}

function getIdentityPayload() {
  return {
    user_id: currentUser?.id || null,
    username: getUsername(),
    display_name: getDisplayName(),
    avatar_url: getAvatarUrl(),
    banner_url: currentProfile?.banner_url || null,
    online_status: currentProfile?.online_status || "online",
    rich_level: currentProfile?.rich_level || "starter",
    rank_title: currentProfile?.rank_title || "new creator",
    meta_avatar: currentMetaAvatar || null,
    avatar_config: currentMetaAvatar?.metadata?.avatar_config || null
  };
}

function updateStats() {
  const route = getRoute();
  const mediaType = selectedFile ? getMediaType(selectedFile) : "ready";

  if (els.statUploads) els.statUploads.textContent = uploads.length.toLocaleString();
  if (els.statSection) els.statSection.textContent = route.section.toUpperCase();
  if (els.statType) els.statType.textContent = mediaType.toUpperCase();
  if (els.uploadCount) els.uploadCount.textContent = uploads.length.toLocaleString();
}

function setProgress(value) {
  const percent = Math.max(0, Math.min(100, Number(value || 0)));
  if (els.progressWrap) els.progressWrap.style.display = "block";
  if (els.progressBar) els.progressBar.style.width = `${percent}%`;
}

function readLocalIdentity() {
  try {
    const raw = localStorage.getItem("rb_current_identity");
    currentIdentity = raw ? JSON.parse(raw) : null;
  } catch {
    currentIdentity = null;
  }
}

async function loadUser() {
  readLocalIdentity();

  const { data } = await supabase.auth.getUser();
  currentUser = data?.user || null;

  if (!currentUser) {
    setStatus("SIGN IN REQUIRED TO UPLOAD", "locked");
    setTimeout(() => {
      window.location.href = "/auth.html";
    }, 800);
    return false;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  currentProfile = profile || {};

  const { data: meta } = await supabase
    .from("meta_avatars")
    .select("*")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  currentMetaAvatar = meta || null;

  return true;
}

function setSelectedFile(file) {
  selectedFile = file || null;

  if (!selectedFile) {
    if (els.previewCard) els.previewCard.style.display = "none";
    if (els.previewSlot) els.previewSlot.innerHTML = "";
    if (els.fileMeta) els.fileMeta.textContent = "";
    updateStats();
    return;
  }

  const mediaType = getMediaType(selectedFile);
  const previewUrl = URL.createObjectURL(selectedFile);

  if (els.previewCard) els.previewCard.style.display = "block";

  if (mediaType === "image") {
    els.previewSlot.innerHTML = `<img class="preview-media" src="${previewUrl}" alt="Preview" />`;
  } else if (mediaType === "video") {
    els.previewSlot.innerHTML = `<video class="preview-media" src="${previewUrl}" controls playsinline></video>`;
  } else if (mediaType === "audio") {
    els.previewSlot.innerHTML = `<audio class="preview-media" src="${previewUrl}" controls></audio>`;
  } else {
    els.previewSlot.innerHTML = `<div class="preview-file">📄</div>`;
  }

  els.fileMeta.innerHTML = `
    <strong>${escapeHtml(selectedFile.name)}</strong><br>
    ${escapeHtml(selectedFile.type || "unknown file")} • ${formatBytes(selectedFile.size)}
  `;

  if (els.titleInput && !els.titleInput.value.trim()) {
    els.titleInput.value = selectedFile.name.replace(/\.[^/.]+$/, "");
  }

  updateStats();
  setStatus("FILE READY", "ready");
}

function setupDragDrop() {
  els.fileInput?.addEventListener("change", () => {
    setSelectedFile(els.fileInput.files?.[0] || null);
  });

  els.dropZone?.addEventListener("click", () => {
    els.fileInput?.click();
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    els.dropZone?.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropZone.classList.add("active");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    els.dropZone?.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropZone.classList.remove("active");
    });
  });

  els.dropZone?.addEventListener("drop", (event) => {
    const file = event.dataTransfer?.files?.[0];
    setSelectedFile(file || null);
  });
}

async function insertFirstWorking(table, payloads = []) {
  let lastError = null;

  for (const payload of payloads) {
    const { data, error } = await supabase
      .from(table)
      .insert(payload)
      .select("*")
      .maybeSingle();

    if (!error) return { data, error: null };

    lastError = error;
    console.warn(`${table} route skipped:`, error.message);
  }

  return { data: null, error: lastError };
}

async function updateFirstWorking(table, filters = [], payload) {
  let query = supabase.from(table).update(payload);

  for (const filter of filters) {
    if (filter.type === "eq") query = query.eq(filter.column, filter.value);
    if (filter.type === "in") query = query.in(filter.column, filter.value);
  }

  const { error } = await query;

  if (error) {
    console.warn(`${table} update skipped:`, error.message);
    return false;
  }

  return true;
}

function buildBaseMetadata(upload, extra = {}) {
  return {
    source: "upload.html",
    app: "Rich Bizness Mobile",
    upload_id: upload.id,
    route_key: upload?.metadata?.route_key,
    bucket: upload.bucket,
    file_path: upload.file_path,
    public_url: upload.public_url,
    identity: getIdentityPayload(),
    ...extra
  };
}

async function runAutoRoute(upload) {
  const routeKey = upload?.metadata?.route_key;
  if (!routeKey) return;

  const identity = getIdentityPayload();
  const username = identity.username;
  const displayName = identity.display_name;
  const avatarUrl = identity.avatar_url;
  const now = new Date().toISOString();

  try {
    if (routeKey === "profile-avatar") {
      await supabase
        .from("profiles")
        .update({
          avatar_url: upload.public_url,
          updated_at: now
        })
        .eq("id", currentUser.id);

      await supabase
        .from("meta_avatars")
        .upsert({
          user_id: currentUser.id,
          display_name: displayName,
          avatar_url: upload.public_url,
          updated_at: now,
          metadata: {
            ...(currentMetaAvatar?.metadata || {}),
            avatar_image_source: "upload_page",
            synced_at: now
          }
        }, { onConflict: "user_id" });

      return;
    }

    if (routeKey === "profile-banner") {
      await supabase
        .from("profiles")
        .update({
          banner_url: upload.public_url,
          updated_at: now
        })
        .eq("id", currentUser.id);

      return;
    }

    if (routeKey === "meta-avatar") {
      await supabase
        .from("meta_avatars")
        .upsert({
          user_id: currentUser.id,
          display_name: displayName,
          avatar_url: upload.public_url,
          updated_at: now,
          metadata: buildBaseMetadata(upload, {
            avatar_image_source: "upload_page",
            synced_at: now
          })
        }, { onConflict: "user_id" });

      return;
    }

    if (routeKey === "feed" || routeKey === "gallery") {
      await insertFirstWorking("feed_posts", [
        {
          user_id: currentUser.id,
          body: upload.description || upload.title,
          media_url: upload.public_url,
          media_type: upload.media_type,
          thumbnail_url: upload.media_type === "image" ? upload.public_url : null,
          section: routeKey,
          visibility: upload.visibility || "public",
          like_count: 0,
          comment_count: 0,
          repost_count: 0,
          view_count: 0,
          is_featured: false,
          is_pinned: false,
          metadata: buildBaseMetadata(upload)
        }
      ]);

      return;
    }

    if (routeKey === "music") {
      if (upload.media_type !== "audio") {
        setStatus("MUSIC ROUTE NEEDS AUDIO FILE", "warn");
        return;
      }

      await insertFirstWorking("music_tracks", [
        {
          user_id: currentUser.id,
          username,
          display_name: displayName,
          title: upload.title,
          description: upload.description,
          audio_url: upload.public_url,
          cover_url: avatarUrl,
          genre: upload.category,
          like_count: 0,
          play_count: 0,
          is_featured: false
        }
      ]);

      return;
    }

    if (routeKey === "music-cover") {
      await updateFirstWorking(
        "music_tracks",
        [{ type: "eq", column: "user_id", value: currentUser.id }],
        { cover_url: upload.public_url }
      );

      return;
    }

    if (routeKey === "podcast") {
      if (upload.media_type !== "audio") {
        setStatus("PODCAST ROUTE NEEDS AUDIO FILE", "warn");
        return;
      }

      await insertFirstWorking("podcast_episodes", [
        {
          user_id: currentUser.id,
          username,
          display_name: displayName,
          title: upload.title,
          description: upload.description,
          audio_url: upload.public_url,
          cover_url: avatarUrl,
          episode_number: 1
        }
      ]);

      return;
    }

    if (routeKey === "podcast-cover") {
      await updateFirstWorking(
        "podcast_episodes",
        [{ type: "eq", column: "user_id", value: currentUser.id }],
        { cover_url: upload.public_url }
      );

      return;
    }

    if (routeKey === "radio") {
      await insertFirstWorking("radio_stations", [
        {
          user_id: currentUser.id,
          station_name: upload.title,
          station_tag: upload.category || "radio",
          stream_url: upload.public_url,
          cover_url: upload.public_url,
          is_live: false
        }
      ]);

      return;
    }

    if (routeKey === "sports" || routeKey === "sports-clip") {
      await insertFirstWorking("sports_posts", [
        {
          user_id: currentUser.id,
          username,
          display_name: displayName,
          title: upload.title,
          body: upload.description,
          sport: upload.category,
          team_name: null,
          media_url: upload.public_url,
          media_type: upload.media_type,
          cover_url: upload.media_type === "image" ? upload.public_url : null,
          like_count: 0,
          comment_count: 0,
          view_count: 0,
          is_featured: false
        }
      ]);

      return;
    }

    if (routeKey === "sports-cover") {
      await insertFirstWorking("sports_broadcasts", [
        {
          user_id: currentUser.id,
          username,
          display_name: displayName,
          title: upload.title,
          description: upload.description,
          sport: upload.category,
          team_name: null,
          stream_url: null,
          replay_url: null,
          cover_url: upload.public_url,
          status: "draft",
          access_type: "free",
          price_cents: 0,
          currency: "usd",
          viewer_count: 0,
          peak_viewers: 0,
          total_revenue_cents: 0,
          metadata: buildBaseMetadata(upload)
        }
      ]);

      return;
    }

    if (routeKey === "gaming") {
      await insertFirstWorking("game_clips", [
        {
          game_id: null,
          game_slug: "general",
          user_id: currentUser.id,
          username,
          title: upload.title,
          clip_url: upload.public_url,
          thumbnail_url: upload.media_type === "image" ? upload.public_url : null,
          like_count: 0,
          view_count: 0
        }
      ]);

      return;
    }

    if (routeKey === "game-cover" || routeKey === "game-asset") {
      await insertFirstWorking("games", [
        {
          slug: `user-${currentUser.id.slice(0, 8)}-${Date.now()}`,
          title: upload.title,
          description: upload.description,
          category: upload.category || "arcade",
          play_url: "#",
          cover_url: upload.public_url,
          logo_url: routeKey === "game-asset" ? upload.public_url : null,
          is_active: true,
          is_featured: false,
          total_plays: 0,
          high_score: 0,
          metadata: buildBaseMetadata(upload)
        }
      ]);

      return;
    }

    if (routeKey === "store-product") {
      await insertFirstWorking("products", [
        {
          seller_id: currentUser.id,
          title: upload.title,
          description: upload.description,
          category: upload.category || "marketplace",
          price_cents: 1000,
          currency: "usd",
          image_url: upload.public_url,
          cover_url: upload.public_url,
          media_url: upload.public_url,
          product_type: "physical",
          fulfillment_type: "shipping",
          quantity: 1,
          is_digital: false,
          is_local: false,
          is_featured: false,
          city: null,
          state: null,
          location_label: null,
          status: "active",
          views: 0,
          likes: 0,
          sales_count: 0,
          metadata: buildBaseMetadata(upload, { source_type: "store_product" })
        }
      ]);

      return;
    }

    if (routeKey === "store-digital") {
      await insertFirstWorking("products", [
        {
          seller_id: currentUser.id,
          title: upload.title,
          description: upload.description,
          category: upload.category || "digital",
          price_cents: 1000,
          currency: "usd",
          image_url: upload.media_type === "image" ? upload.public_url : null,
          cover_url: upload.media_type === "image" ? upload.public_url : null,
          media_url: upload.public_url,
          product_type: "digital",
          fulfillment_type: "digital",
          quantity: 999,
          is_digital: true,
          is_local: false,
          is_featured: false,
          city: null,
          state: null,
          location_label: null,
          status: "active",
          views: 0,
          likes: 0,
          sales_count: 0,
          metadata: buildBaseMetadata(upload, { source_type: "store_digital" })
        }
      ]);

      return;
    }

    if (routeKey === "store-seller") {
      await supabase
        .from("store_seller_profiles")
        .upsert({
          user_id: currentUser.id,
          seller_name: displayName,
          bio: currentProfile?.bio || null,
          avatar_url: avatarUrl,
          banner_url: upload.public_url,
          status: "active",
          metadata: buildBaseMetadata(upload),
          updated_at: now
        }, { onConflict: "user_id" });

      return;
    }

    if (routeKey === "live-thumbnail") {
      await updateFirstWorking(
        "live_streams",
        [{ type: "eq", column: "user_id", value: currentUser.id }],
        {
          thumbnail_url: upload.public_url,
          cover_url: upload.public_url,
          last_activity_at: now,
          metadata: buildBaseMetadata(upload)
        }
      );

      return;
    }

    if (routeKey === "live-recording") {
      await insertFirstWorking("live_streams", [
        {
          creator_id: currentUser.id,
          user_id: currentUser.id,
          username,
          display_name: displayName,
          title: upload.title,
          description: upload.description,
          category: upload.category || "recording",
          status: "ended",
          access_type: "free",
          price_cents: 0,
          currency: "usd",
          livekit_room_name: null,
          slug: `recording-${currentUser.id.slice(0, 8)}-${Date.now()}`,
          viewer_count: 0,
          total_revenue_cents: 0,
          is_chat_enabled: true,
          thumbnail_url: upload.media_type === "image" ? upload.public_url : null,
          cover_url: upload.media_type === "image" ? upload.public_url : null,
          peak_viewers: 0,
          total_chat_messages: 0,
          total_reactions: 0,
          is_cohost_enabled: false,
          is_vip_enabled: false,
          is_featured: false,
          ended_at: now,
          last_activity_at: now,
          metadata: buildBaseMetadata(upload, {
            recording_url: upload.public_url,
            source_type: "live_recording"
          })
        }
      ]);

      return;
    }
  } catch (error) {
    console.warn("Auto route skipped:", error.message);
    setStatus(`AUTO ROUTE SKIPPED: ${error.message}`, "warn");
  }
}

async function uploadFile() {
  if (!currentUser) {
    window.location.href = "/auth.html";
    return;
  }

  if (!selectedFile) {
    setStatus("CHOOSE A FILE FIRST", "missing");
    return;
  }

  const route = getRoute();
  const routeKey = getRouteKey();
  const mediaType = getMediaType(selectedFile);
  const title = getTitle();
  const category = els.categoryInput?.value.trim() || route.category;
  const visibility = els.visibilityInput?.value || "public";

  const path = [
    currentUser.id,
    route.section,
    `${Date.now()}-${safeFileName(selectedFile.name)}`
  ].join("/");

  try {
    if (els.uploadBtn) els.uploadBtn.disabled = true;

    setProgress(5);
    setStatus("UPLOADING TO CLOUD...", "uploading");

    const { error: uploadError } = await supabase.storage
      .from(route.bucket)
      .upload(path, selectedFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: selectedFile.type || undefined
      });

    if (uploadError) throw uploadError;

    setProgress(65);
    setStatus("BUILDING PUBLIC URL...", "processing");

    const { data: publicData } = supabase.storage
      .from(route.bucket)
      .getPublicUrl(path);

    const publicUrl = publicData?.publicUrl;
    if (!publicUrl) throw new Error("Public URL missing");

    setProgress(78);
    setStatus("SAVING UNIVERSAL UPLOAD RECORD...", "saving");

    const payload = {
      user_id: currentUser.id,
      category,
      section: route.section,
      title,
      description: els.descriptionInput?.value.trim() || null,
      bucket: route.bucket,
      file_path: path,
      public_url: publicUrl,
      mime_type: selectedFile.type || null,
      file_size: selectedFile.size || null,
      media_type: mediaType,
      visibility,
      processing_status: "completed",
      metadata: {
        source: "upload.html",
        app: "Rich Bizness Mobile",
        route_key: routeKey,
        original_name: selectedFile.name,
        identity: getIdentityPayload()
      }
    };

    const { data, error } = await supabase
      .from("uploads")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;

    setProgress(92);
    setStatus("ROUTING INTO SECTION TABLE...", "routing");

    await runAutoRoute(data);

    uploads.unshift(data);
    renderUploads();
    updateStats();

    setProgress(100);
    setStatus("UPLOAD LIVE ACROSS RICH BIZNESS", "complete");
    resetFormSoft();
  } catch (error) {
    console.error("Upload error:", error);
    setStatus(`UPLOAD ERROR: ${error.message}`, "error");
  } finally {
    if (els.uploadBtn) els.uploadBtn.disabled = false;

    setTimeout(() => {
      if (els.progressWrap) els.progressWrap.style.display = "none";
      if (els.progressBar) els.progressBar.style.width = "0%";
    }, 1200);
  }
}

function resetFormSoft() {
  selectedFile = null;

  if (els.fileInput) els.fileInput.value = "";
  if (els.previewCard) els.previewCard.style.display = "none";
  if (els.previewSlot) els.previewSlot.innerHTML = "";
  if (els.fileMeta) els.fileMeta.textContent = "";
  if (els.titleInput) els.titleInput.value = "";
  if (els.categoryInput) els.categoryInput.value = "";
  if (els.descriptionInput) els.descriptionInput.value = "";

  updateStats();
}

async function loadUploads() {
  const safeUserId = currentUser?.id || "00000000-0000-0000-0000-000000000000";

  const { data, error } = await supabase
    .from("uploads")
    .select("*")
    .or(`visibility.eq.public,user_id.eq.${safeUserId}`)
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) {
    console.warn("Uploads load error:", error.message);

    if (els.uploadsList) {
      els.uploadsList.innerHTML = `<div class="empty">Uploads could not load. Check uploads RLS.</div>`;
    }

    return;
  }

  uploads = data || [];
  renderUploads();
  updateStats();
}

function renderUploads() {
  if (!els.uploadsList) return;

  if (!uploads.length) {
    els.uploadsList.innerHTML = `
      <div class="empty">No uploads yet. Drop the first file into the Rich Bizness cloud.</div>
    `;
    return;
  }

  els.uploadsList.innerHTML = uploads.map((upload) => {
    const isImage = upload.media_type === "image";
    const icon =
      upload.media_type === "video" ? "🎬" :
      upload.media_type === "audio" ? "🎵" :
      upload.media_type === "document" ? "📄" :
      upload.media_type === "archive" ? "🗂️" :
      "⬆️";

    const thumb = isImage
      ? `<img class="thumb" src="${escapeHtml(upload.public_url)}" alt="${escapeHtml(upload.title || "Upload")}" />`
      : `<div class="thumb">${icon}</div>`;

    return `
      <article class="upload-card">
        ${thumb}

        <div class="upload-info">
          <h3>${escapeHtml(upload.title || "Rich Bizness Upload")}</h3>

          <div class="upload-meta">
            ${escapeHtml(upload.section || "general")} ·
            ${escapeHtml(upload.category || "upload")} ·
            ${escapeHtml(upload.bucket || "bucket")} ·
            ${escapeHtml(upload.media_type || "file")}
          </div>

          <p>${escapeHtml(upload.description || upload.file_path || "Realtime media upload.")}</p>

          <div class="upload-actions">
            <button class="small-btn" data-open="${escapeHtml(upload.public_url)}">OPEN</button>
            <button class="small-btn" data-copy="${escapeHtml(upload.public_url)}">COPY URL</button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function startRealtime() {
  if (realtimeChannel) supabase.removeChannel(realtimeChannel);
  if (!currentUser?.id) return;

  realtimeChannel = supabase
    .channel("rich-bizness-uploads-corrected")
    .on("postgres_changes", { event: "*", schema: "public", table: "uploads" }, async () => {
      await loadUploads();
      setStatus("UPLOADS UPDATED LIVE", "realtime");
    })
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "profiles",
      filter: `id=eq.${currentUser.id}`
    }, async (payload) => {
      if (payload.new) currentProfile = payload.new;
    })
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "meta_avatars",
      filter: `user_id=eq.${currentUser.id}`
    }, async (payload) => {
      if (payload.new) currentMetaAvatar = payload.new;
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") setStatus("UPLOAD REALTIME CONNECTED", "ready");
    });
}

els.sectionInput?.addEventListener("change", () => {
  const route = getRoute();

  if (els.categoryInput && !els.categoryInput.value.trim()) {
    els.categoryInput.value = route.category;
  }

  updateStats();
});

els.uploadBtn?.addEventListener("click", uploadFile);

document.addEventListener("click", async (event) => {
  const open = event.target.closest("[data-open]");
  const copy = event.target.closest("[data-copy]");

  if (open) window.open(open.dataset.open, "_blank");

  if (copy) {
    try {
      await navigator.clipboard.writeText(copy.dataset.copy);
      setStatus("URL COPIED", "copied");
    } catch {
      prompt("Copy URL:", copy.dataset.copy);
    }
  }
});

window.addEventListener("rb:identity-updated", (event) => {
  currentIdentity = event.detail || null;
  setStatus("IDENTITY SYNCED INTO UPLOAD", "ready");
});

async function bootUpload() {
  setStatus("BOOTING UPLOAD ENGINE...", "boot");

  const ok = await loadUser();
  if (!ok) return;

  setupDragDrop();
  await loadUploads();

  startRealtime();
  updateStats();

  setStatus("UPLOAD ENGINE READY", "ready");
}

bootUpload();
