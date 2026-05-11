import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================
   RICH BIZNESS MOBILE GALLERY
   /core/pages/gallery.js
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
  statMedia: $("statMedia"),
  statLikes: $("statLikes"),
  statViews: $("statViews"),
  statStatus: $("statStatus"),

  searchInput: $("searchInput"),
  filterInput: $("filterInput"),
  galleryStatus: $("galleryStatus"),
  galleryGrid: $("galleryGrid"),

  viewer: $("viewer"),
  viewerTitle: $("viewerTitle"),
  viewerMedia: $("viewerMedia"),
  viewerInfo: $("viewerInfo"),
  closeViewerBtn: $("closeViewerBtn")
};

let currentUser = null;
let currentProfile = null;
let uploads = [];
let likes = [];
let views = [];
let comments = [];
let realtimeChannel = null;

function setStatus(message, mode = "ready") {
  els.galleryStatus.textContent = message || "";
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

function getAnonymousId() {
  const existing = localStorage.getItem("rb_gallery_guest_id");
  if (existing) return existing;

  const id = crypto.randomUUID();
  localStorage.setItem("rb_gallery_guest_id", id);
  return id;
}

function countForUpload(rows, uploadId) {
  return rows.filter((row) => row.upload_id === uploadId).length;
}

function updateStats() {
  els.statMedia.textContent = uploads.length.toLocaleString();
  els.statLikes.textContent = likes.length.toLocaleString();
  els.statViews.textContent = views.length.toLocaleString();
}

function getUploadById(id) {
  return uploads.find((upload) => upload.id === id);
}

/* =========================
   AUTH
========================= */
async function loadUser() {
  const { data } = await supabase.auth.getUser();
  currentUser = data?.user || null;

  if (!currentUser) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("id", currentUser.id)
    .maybeSingle();

  currentProfile = profile || null;
}

/* =========================
   LOAD DATA
========================= */
async function loadUploads() {
  const { data, error } = await supabase
    .from("uploads")
    .select("*")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(120);

  if (error) {
    console.warn("Gallery uploads error:", error);
    els.galleryGrid.innerHTML = `<div class="empty">Gallery could not load. Check uploads RLS.</div>`;
    return;
  }

  uploads = data || [];
}

async function loadLikes() {
  if (!uploads.length) {
    likes = [];
    return;
  }

  const ids = uploads.map((upload) => upload.id);

  const { data, error } = await supabase
    .from("gallery_likes")
    .select("*")
    .in("upload_id", ids);

  if (error) {
    console.warn("Gallery likes error:", error);
    likes = [];
    return;
  }

  likes = data || [];
}

async function loadViews() {
  if (!uploads.length) {
    views = [];
    return;
  }

  const ids = uploads.map((upload) => upload.id);

  const { data, error } = await supabase
    .from("gallery_views")
    .select("*")
    .in("upload_id", ids);

  if (error) {
    console.warn("Gallery views error:", error);
    views = [];
    return;
  }

  views = data || [];
}

async function loadComments() {
  if (!uploads.length) {
    comments = [];
    return;
  }

  const ids = uploads.map((upload) => upload.id);

  const { data, error } = await supabase
    .from("gallery_comments")
    .select("*")
    .in("upload_id", ids)
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("Gallery comments error:", error);
    comments = [];
    return;
  }

  comments = data || [];
}

async function refreshAll() {
  await loadUploads();
  await loadLikes();
  await loadViews();
  await loadComments();

  renderGallery();
  updateStats();
}

/* =========================
   FILTERS
========================= */
function filteredUploads() {
  const q = (els.searchInput.value || "").trim().toLowerCase();
  const filter = els.filterInput.value || "all";

  return uploads.filter((upload) => {
    const haystack = [
      upload.title,
      upload.description,
      upload.category,
      upload.section,
      upload.media_type,
      upload.bucket,
      upload.file_path
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = !q || haystack.includes(q);

    let matchesFilter = true;

    if (filter !== "all") {
      matchesFilter =
        upload.section === filter ||
        upload.category === filter ||
        upload.media_type === filter ||
        upload.bucket?.includes(filter);
    }

    return matchesSearch && matchesFilter;
  });
}

/* =========================
   RENDER
========================= */
function renderMedia(upload, autoplay = false) {
  const url = escapeHtml(upload.public_url || "");
  const title = escapeHtml(upload.title || "Rich Bizness Media");

  if (upload.media_type === "image") {
    return `<img src="${url}" alt="${title}" loading="lazy" />`;
  }

  if (upload.media_type === "video") {
    return `<video src="${url}" controls playsinline ${autoplay ? "autoplay" : ""}></video>`;
  }

  if (upload.media_type === "audio") {
    return `
      <div class="file-icon">🎵</div>
      <audio src="${url}" controls style="width:92%;margin:18px auto;display:block;"></audio>
    `;
  }

  if (upload.media_type === "document") {
    return `<div class="file-icon">📄</div>`;
  }

  if (upload.media_type === "archive") {
    return `<div class="file-icon">🗂️</div>`;
  }

  return `<div class="file-icon">▣</div>`;
}

function renderGallery() {
  const list = filteredUploads();

  if (!list.length) {
    els.galleryGrid.innerHTML = `
      <div class="empty">No gallery media yet. Upload something through the upload portal.</div>
    `;
    return;
  }

  els.galleryGrid.innerHTML = list.map((upload) => {
    const likeCount = countForUpload(likes, upload.id);
    const viewCount = countForUpload(views, upload.id);
    const commentCount = countForUpload(comments, upload.id);

    return `
      <article class="card" data-card="${upload.id}">
        <div class="media-wrap">
          <div class="badge">${escapeHtml(upload.media_type || "media")}</div>
          ${renderMedia(upload)}
        </div>

        <div class="card-body">
          <h3>${escapeHtml(upload.title || "Rich Bizness Upload")}</h3>
          <div class="meta">
            ${escapeHtml(upload.section || "global")} ·
            ${escapeHtml(upload.category || "media")} ·
            ${escapeHtml(upload.bucket || "cloud")}
          </div>

          <p>${escapeHtml(upload.description || "Realtime Rich Bizness gallery media.")}</p>

          <div class="actions">
            <button class="small-btn" data-open="${upload.id}">OPEN</button>
            <button class="small-btn" data-like="${upload.id}">♡ ${likeCount}</button>
            <button class="small-btn" data-comment="${upload.id}">💬 ${commentCount}</button>
            <button class="small-btn" data-copy="${escapeHtml(upload.public_url)}">COPY</button>
          </div>

          <div class="meta" style="margin-top:10px;">${viewCount} VIEWS</div>

          <div class="comments" id="comments-${upload.id}">
            <div class="comment-list">
              ${comments
                .filter((comment) => comment.upload_id === upload.id)
                .map((comment) => `
                  <div class="comment">
                    <strong>${escapeHtml(comment.user_id === currentUser?.id ? "YOU" : "FAN")}</strong>
                    ${escapeHtml(comment.body)}
                  </div>
                `).join("") || `<div class="comment">No comments yet.</div>`}
            </div>

            <div class="comment-form">
              <input id="comment-input-${upload.id}" placeholder="Drop a comment..." />
              <button class="send-btn" data-send-comment="${upload.id}">➤</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

/* =========================
   ACTIONS
========================= */
async function openViewer(uploadId) {
  const upload = getUploadById(uploadId);
  if (!upload) return;

  await recordView(uploadId);

  els.viewerTitle.textContent = upload.title || "Rich Bizness Media";
  els.viewerMedia.innerHTML = renderMedia(upload, true);
  els.viewerInfo.innerHTML = `
    <strong>${escapeHtml(upload.section || "global")} · ${escapeHtml(upload.category || "media")}</strong><br>
    ${escapeHtml(upload.description || "Realtime Rich Bizness media.")}<br>
    <br>
    <span>${escapeHtml(upload.public_url)}</span>
  `;

  els.viewer.classList.add("open");
}

function closeViewer() {
  els.viewer.classList.remove("open");
  els.viewerMedia.innerHTML = "";
}

async function recordView(uploadId) {
  const { error } = await supabase
    .from("gallery_views")
    .insert({
      upload_id: uploadId,
      user_id: currentUser?.id || null,
      anonymous_id: currentUser ? null : getAnonymousId()
    });

  if (error) {
    console.warn("View record skipped:", error.message);
    return;
  }

  await refreshAll();
}

async function likeUpload(uploadId) {
  if (!currentUser) {
    window.location.href = "/auth.html";
    return;
  }

  const alreadyLiked = likes.some(
    (like) => like.upload_id === uploadId && like.user_id === currentUser.id
  );

  if (alreadyLiked) {
    const { error } = await supabase
      .from("gallery_likes")
      .delete()
      .eq("upload_id", uploadId)
      .eq("user_id", currentUser.id);

    if (error) {
      setStatus(`LIKE ERROR: ${error.message}`, "error");
      return;
    }

    setStatus("LIKE REMOVED", "live");
  } else {
    const { error } = await supabase
      .from("gallery_likes")
      .insert({
        upload_id: uploadId,
        user_id: currentUser.id
      });

    if (error && !String(error.message || "").toLowerCase().includes("duplicate")) {
      setStatus(`LIKE ERROR: ${error.message}`, "error");
      return;
    }

    setStatus("MEDIA LIKED", "live");
  }

  await refreshAll();
}

function toggleComments(uploadId) {
  const box = document.getElementById(`comments-${uploadId}`);
  if (!box) return;

  box.classList.toggle("open");
}

async function sendComment(uploadId) {
  if (!currentUser) {
    window.location.href = "/auth.html";
    return;
  }

  const input = document.getElementById(`comment-input-${uploadId}`);
  const body = input?.value?.trim();

  if (!body) return;

  const { error } = await supabase
    .from("gallery_comments")
    .insert({
      upload_id: uploadId,
      user_id: currentUser.id,
      body
    });

  if (error) {
    setStatus(`COMMENT ERROR: ${error.message}`, "error");
    return;
  }

  input.value = "";
  setStatus("COMMENT POSTED", "live");
  await refreshAll();

  const box = document.getElementById(`comments-${uploadId}`);
  if (box) box.classList.add("open");
}

async function copyUrl(url) {
  try {
    await navigator.clipboard.writeText(url);
    setStatus("URL COPIED", "copied");
  } catch {
    prompt("Copy URL:", url);
  }
}

/* =========================
   REALTIME
========================= */
function startRealtime() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }

  realtimeChannel = supabase
    .channel("rich-bizness-gallery")
    .on("postgres_changes", { event: "*", schema: "public", table: "uploads" }, async () => {
      await refreshAll();
      setStatus("GALLERY UPDATED LIVE", "live");
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "gallery_likes" }, async () => {
      await refreshAll();
      setStatus("LIKES UPDATED LIVE", "live");
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "gallery_views" }, async () => {
      await refreshAll();
      setStatus("VIEWS UPDATED LIVE", "live");
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "gallery_comments" }, async () => {
      await refreshAll();
      setStatus("COMMENTS UPDATED LIVE", "live");
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setStatus("GALLERY REALTIME CONNECTED", "ready");
      }
    });
}

/* =========================
   EVENTS
========================= */
els.searchInput.addEventListener("input", renderGallery);
els.filterInput.addEventListener("change", renderGallery);
els.closeViewerBtn.addEventListener("click", closeViewer);

document.addEventListener("click", async (event) => {
  const open = event.target.closest("[data-open]");
  const like = event.target.closest("[data-like]");
  const comment = event.target.closest("[data-comment]");
  const sendCommentBtn = event.target.closest("[data-send-comment]");
  const copy = event.target.closest("[data-copy]");

  if (open) {
    await openViewer(open.dataset.open);
    return;
  }

  if (like) {
    await likeUpload(like.dataset.like);
    return;
  }

  if (comment) {
    toggleComments(comment.dataset.comment);
    return;
  }

  if (sendCommentBtn) {
    await sendComment(sendCommentBtn.dataset.sendComment);
    return;
  }

  if (copy) {
    await copyUrl(copy.dataset.copy);
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeViewer();
});

/* =========================
   BOOT
========================= */
async function bootGallery() {
  setStatus("BOOTING GALLERY...", "boot");

  await loadUser();
  await refreshAll();

  startRealtime();
  updateStats();

  setStatus("GALLERY READY", "ready");
}

bootGallery();
