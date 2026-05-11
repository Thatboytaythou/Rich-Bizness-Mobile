import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================
   RICH BIZNESS MOBILE UPLOAD
   /core/pages/upload.js
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
let selectedFile = null;
let uploads = [];
let realtimeChannel = null;

const ROUTES = {
  general: { bucket: "general-uploads", section: "general", category: "general" },
  "profile-avatar": { bucket: "avatars", section: "profile", category: "avatar" },
  "profile-banner": { bucket: "profile-banners", section: "profile", category: "banner" },
  feed: { bucket: "general-uploads", section: "feed", category: "feed" },

  music: { bucket: "music-audio", section: "music", category: "music" },
  podcast: { bucket: "podcast-audio", section: "podcast", category: "podcast" },

  sports: { bucket: "sports-media", section: "sports", category: "sports" },
  gaming: { bucket: "gaming-media", section: "gaming", category: "gaming" },
  gallery: { bucket: "gallery-media", section: "gallery", category: "gallery" },

  "store-product": { bucket: "store-products", section: "store", category: "product" },
  "store-digital": { bucket: "store-digital", section: "store", category: "digital" },
  "store-seller": { bucket: "store-seller-media", section: "store", category: "seller" },

  "live-thumbnail": { bucket: "live-thumbnails", section: "live", category: "thumbnail" },
  "live-recording": { bucket: "live-recordings", section: "live", category: "recording" }
};

function setStatus(message, mode = "idle") {
  els.uploadStatus.textContent = message || "";
  els.statStatus.textContent = mode.toUpperCase();
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

  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  if (type.includes("pdf")) return "document";
  if (type.includes("zip")) return "archive";

  return "file";
}

function getRoute() {
  return ROUTES[els.sectionInput.value] || ROUTES.general;
}

function getTitle() {
  return (
    els.titleInput.value.trim() ||
    selectedFile?.name?.replace(/\.[^/.]+$/, "") ||
    "Rich Bizness Upload"
  );
}

function updateStats() {
  const route = getRoute();
  const mediaType = selectedFile ? getMediaType(selectedFile) : "ready";

  els.statUploads.textContent = uploads.length.toLocaleString();
  els.statSection.textContent = route.section.toUpperCase();
  els.statType.textContent = mediaType.toUpperCase();
  els.uploadCount.textContent = uploads.length.toLocaleString();
}

function setProgress(value) {
  const percent = Math.max(0, Math.min(100, Number(value || 0)));

  els.progressWrap.style.display = "block";
  els.progressBar.style.width = `${percent}%`;
}

/* =========================
   AUTH
========================= */
async function loadUser() {
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
    .select("id, username, display_name, avatar_url")
    .eq("id", currentUser.id)
    .maybeSingle();

  currentProfile = profile || null;
  return true;
}

/* =========================
   FILE PICK + PREVIEW
========================= */
function setSelectedFile(file) {
  selectedFile = file || null;

  if (!selectedFile) {
    els.previewCard.style.display = "none";
    els.previewSlot.innerHTML = "";
    els.fileMeta.textContent = "";
    updateStats();
    return;
  }

  const mediaType = getMediaType(selectedFile);
  const previewUrl = URL.createObjectURL(selectedFile);

  els.previewCard.style.display = "block";

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

  if (!els.titleInput.value.trim()) {
    els.titleInput.value = selectedFile.name.replace(/\.[^/.]+$/, "");
  }

  updateStats();
  setStatus("FILE READY", "ready");
}

function setupDragDrop() {
  els.fileInput.addEventListener("change", () => {
    setSelectedFile(els.fileInput.files?.[0] || null);
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    els.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropZone.classList.add("active");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    els.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropZone.classList.remove("active");
    });
  });

  els.dropZone.addEventListener("drop", (event) => {
    const file = event.dataTransfer?.files?.[0];
    setSelectedFile(file || null);
  });
}

/* =========================
   STORAGE UPLOAD
========================= */
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
  const mediaType = getMediaType(selectedFile);
  const title = getTitle();
  const category = els.categoryInput.value.trim() || route.category;
  const visibility = els.visibilityInput.value || "public";

  const path = [
    currentUser.id,
    route.section,
    `${Date.now()}-${safeFileName(selectedFile.name)}`
  ].join("/");

  try {
    els.uploadBtn.disabled = true;
    setProgress(5);
    setStatus("UPLOADING TO CLOUD...", "uploading");

    const { error: uploadError } = await supabase.storage
      .from(route.bucket)
      .upload(path, selectedFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: selectedFile.type || undefined
      });

    if (uploadError) {
      throw uploadError;
    }

    setProgress(65);
    setStatus("BUILDING PUBLIC URL...", "processing");

    const { data: publicData } = supabase.storage
      .from(route.bucket)
      .getPublicUrl(path);

    const publicUrl = publicData?.publicUrl;

    if (!publicUrl) {
      throw new Error("Public URL missing");
    }

    setProgress(78);
    setStatus("SAVING UPLOAD RECORD...", "saving");

    const payload = {
      user_id: currentUser.id,
      category,
      section: route.section,
      title,
      description: els.descriptionInput.value.trim() || null,
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
        route_key: els.sectionInput.value,
        original_name: selectedFile.name
      }
    };

    const { data, error } = await supabase
      .from("uploads")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    setProgress(92);
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
    els.uploadBtn.disabled = false;

    setTimeout(() => {
      els.progressWrap.style.display = "none";
      els.progressBar.style.width = "0%";
    }, 1100);
  }
}

function resetFormSoft() {
  selectedFile = null;
  els.fileInput.value = "";
  els.previewCard.style.display = "none";
  els.previewSlot.innerHTML = "";
  els.fileMeta.textContent = "";
  els.titleInput.value = "";
  els.categoryInput.value = "";
  els.descriptionInput.value = "";
}

/* =========================
   AUTO ROUTING INTO SECTIONS
========================= */
async function runAutoRoute(upload) {
  const routeKey = upload?.metadata?.route_key;

  if (!routeKey) return;

  try {
    if (routeKey === "profile-avatar") {
      await supabase
        .from("profiles")
        .update({ avatar_url: upload.public_url })
        .eq("id", currentUser.id);
    }

    if (routeKey === "profile-banner") {
      await supabase
        .from("profiles")
        .update({ banner_url: upload.public_url })
        .eq("id", currentUser.id);
    }

    if (routeKey === "feed") {
      await supabase.from("feed_posts").insert({
        user_id: currentUser.id,
        body: upload.description || upload.title,
        media_url: upload.public_url,
        media_type: upload.media_type,
        post_type: upload.media_type || "upload",
        metadata: {
          upload_id: upload.id
        }
      });
    }

    if (routeKey === "music" && upload.media_type === "audio") {
      await supabase.from("music_tracks").insert({
        creator_id: currentUser.id,
        title: upload.title,
        description: upload.description,
        audio_url: upload.public_url,
        genre: upload.category,
        is_published: true,
        metadata: {
          upload_id: upload.id
        }
      });
    }

    if (routeKey === "podcast" && upload.media_type === "audio") {
      await supabase.from("podcast_episodes").insert({
        creator_id: currentUser.id,
        title: upload.title,
        description: upload.description,
        audio_url: upload.public_url,
        is_published: true,
        metadata: {
          upload_id: upload.id
        }
      });
    }

    if (routeKey === "sports") {
      await supabase.from("sports_posts").insert({
        user_id: currentUser.id,
        title: upload.title,
        description: upload.description,
        media_url: upload.public_url,
        media_type: upload.media_type,
        sport: upload.category,
        metadata: {
          upload_id: upload.id
        }
      });
    }

    if (routeKey === "gaming") {
      await supabase.from("game_clips").insert({
        user_id: currentUser.id,
        title: upload.title,
        description: upload.description,
        clip_url: upload.public_url,
        media_type: upload.media_type,
        metadata: {
          upload_id: upload.id
        }
      });
    }

    if (routeKey === "gallery") {
      await supabase.from("feed_posts").insert({
        user_id: currentUser.id,
        body: upload.description || upload.title,
        media_url: upload.public_url,
        media_type: upload.media_type,
        post_type: "gallery",
        metadata: {
          upload_id: upload.id
        }
      });
    }

    if (routeKey === "store-product") {
      await supabase.from("products").insert({
        seller_id: currentUser.id,
        title: upload.title,
        description: upload.description,
        category: upload.category || "marketplace",
        price_cents: 1000,
        currency: "usd",
        image_url: upload.public_url,
        cover_url: upload.public_url,
        product_type: "physical",
        fulfillment_type: "shipping",
        quantity: 1,
        status: "active",
        metadata: {
          upload_id: upload.id,
          source: "upload_auto_route"
        }
      });
    }

    if (routeKey === "store-digital") {
      await supabase.from("products").insert({
        seller_id: currentUser.id,
        title: upload.title,
        description: upload.description,
        category: upload.category || "digital",
        price_cents: 1000,
        currency: "usd",
        media_url: upload.public_url,
        product_type: "digital",
        fulfillment_type: "digital",
        quantity: 999,
        is_digital: true,
        status: "active",
        metadata: {
          upload_id: upload.id,
          source: "upload_auto_route"
        }
      });
    }

    if (routeKey === "live-thumbnail") {
      await supabase
        .from("live_streams")
        .update({
          thumbnail_url: upload.public_url,
          cover_url: upload.public_url
        })
        .eq("user_id", currentUser.id)
        .in("status", ["draft", "offline", "live"]);
    }
  } catch (error) {
    console.warn("Auto route skipped:", error.message);
  }
}

/* =========================
   LOAD / RENDER UPLOADS
========================= */
async function loadUploads() {
  const { data, error } = await supabase
    .from("uploads")
    .select("*")
    .or("visibility.eq.public,user_id.eq." + (currentUser?.id || "00000000-0000-0000-0000-000000000000"))
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) {
    console.warn("Uploads load error:", error);
    els.uploadsList.innerHTML = `<div class="empty">Uploads could not load. Check uploads RLS.</div>`;
    return;
  }

  uploads = data || [];
  renderUploads();
  updateStats();
}

function renderUploads() {
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

/* =========================
   REALTIME
========================= */
function startRealtime() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }

  realtimeChannel = supabase
    .channel("rich-bizness-uploads")
    .on("postgres_changes", { event: "*", schema: "public", table: "uploads" }, async () => {
      await loadUploads();
      setStatus("UPLOADS UPDATED LIVE", "realtime");
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setStatus("UPLOAD REALTIME CONNECTED", "ready");
      }
    });
}

/* =========================
   EVENTS
========================= */
els.sectionInput.addEventListener("change", () => {
  const route = getRoute();

  if (!els.categoryInput.value.trim()) {
    els.categoryInput.value = route.category;
  }

  updateStats();
});

els.uploadBtn.addEventListener("click", uploadFile);

document.addEventListener("click", async (event) => {
  const open = event.target.closest("[data-open]");
  const copy = event.target.closest("[data-copy]");

  if (open) {
    window.open(open.dataset.open, "_blank");
  }

  if (copy) {
    try {
      await navigator.clipboard.writeText(copy.dataset.copy);
      setStatus("URL COPIED", "copied");
    } catch {
      prompt("Copy URL:", copy.dataset.copy);
    }
  }
});

/* =========================
   BOOT
========================= */
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
