import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================
   RICH BIZNESS MOBILE FEED
   /core/pages/feed.js
   Full Identity + Upload + Meta Avatar Sync
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
  composerAvatar: $("composerAvatar"),
  composerName: $("composerName"),
  composerStatus: $("composerStatus"),
  postBody: $("postBody"),
  mediaUrl: $("mediaUrl"),
  mediaType: $("mediaType"),
  postBtn: $("postBtn"),
  feedStatus: $("feedStatus"),
  feedList: $("feedList")
};

let currentUser = null;
let currentProfile = null;
let currentMetaAvatar = null;
let posts = [];
let profilesById = new Map();
let metaByUserId = new Map();
let likedPostIds = new Set();
let realtimeChannel = null;

function setStatus(message) {
  if (els.feedStatus) els.feedStatus.textContent = message || "";
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "JUST NOW";
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minute = 60000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "JUST NOW";
  if (diff < hour) return `${Math.floor(diff / minute)}M AGO`;
  if (diff < day) return `${Math.floor(diff / hour)}H AGO`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" }).toUpperCase();
}

function getProfileName(profile, user = null) {
  return (
    profile?.display_name ||
    profile?.username ||
    user?.email?.split("@")[0] ||
    "Rich Creator"
  );
}

function getUsername(profile, user = null) {
  return (
    profile?.username ||
    user?.email?.split("@")[0] ||
    "creator"
  );
}

function getInitial(name = "R") {
  return String(name || "R").trim().slice(0, 1).toUpperCase();
}

function getAvatarUrl(profile, meta = null) {
  return profile?.avatar_url || meta?.avatar_url || null;
}

function avatarHtml(profile, user = null, meta = null) {
  const name = getProfileName(profile, user);
  const avatarUrl = getAvatarUrl(profile, meta);

  if (avatarUrl) {
    return `<img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(name)} avatar" />`;
  }

  return escapeHtml(getInitial(name));
}

function getPostSection(post) {
  return String(post.section || post.post_type || "feed").toUpperCase();
}

function getPostBadge(post) {
  const section = String(post.section || post.post_type || "feed").toLowerCase();
  const type = String(post.media_type || "text").toLowerCase();

  if (section === "gallery") return "🖼️ GALLERY DROP";
  if (section === "music" || type === "audio") return "🎵 AUDIO DROP";
  if (section === "sports") return "🏆 SPORTS DROP";
  if (section === "gaming") return "🎮 GAMING DROP";
  if (section === "live") return "🔴 LIVE DROP";
  return "◆ FEED DROP";
}

function mediaHtml(post) {
  if (!post.media_url) return "";

  const url = escapeHtml(post.media_url);
  const type = String(post.media_type || "text").toLowerCase();

  if (type === "image") {
    return `<img class="post-media" src="${url}" alt="Feed media" loading="lazy" />`;
  }

  if (type === "video") {
    return `<video class="post-media" src="${url}" controls playsinline preload="metadata"></video>`;
  }

  if (type === "audio") {
    return `
      <div style="margin:12px 0;padding:14px;border-radius:20px;border:1px solid rgba(157,255,103,.22);background:rgba(0,0,0,.45);">
        <div style="color:#9dff67;font-weight:950;letter-spacing:.14em;font-size:11px;margin-bottom:10px;">RICH AUDIO PLAYER</div>
        <audio src="${url}" controls style="width:100%;"></audio>
      </div>
    `;
  }

  return `
    <a class="action-btn" href="${url}" target="_blank" rel="noopener" style="display:block;text-align:center;text-decoration:none;margin-bottom:12px;">
      OPEN MEDIA
    </a>
  `;
}

function tinyMetaAvatar(meta) {
  if (!meta) return "";

  const config = {
    body: "athletic",
    hair: "waves",
    outfit: "money",
    motion: "idle_breathe",
    ...(meta?.metadata?.avatar_config || {}),
    ...(meta?.outfit || {})
  };

  return `
    <span style="display:inline-flex;align-items:center;gap:5px;color:#9dff67;">
      🧍 ${escapeHtml(String(config.motion || "idle").replaceAll("_", " ").toUpperCase())}
    </span>
  `;
}

function saveIdentityCache() {
  if (!currentUser || !currentProfile) return;

  const payload = {
    user_id: currentUser.id,
    username: getUsername(currentProfile, currentUser),
    display_name: getProfileName(currentProfile, currentUser),
    avatar_url: currentProfile.avatar_url || currentMetaAvatar?.avatar_url || null,
    banner_url: currentProfile.banner_url || null,
    meta_avatar: currentMetaAvatar,
    updated_at: new Date().toISOString()
  };

  localStorage.setItem("rb_current_identity", JSON.stringify(payload));
}

async function loadUser() {
  const { data } = await supabase.auth.getUser();
  currentUser = data?.user || null;

  if (!currentUser) {
    currentProfile = null;
    currentMetaAvatar = null;
    els.composerName.textContent = "Guest Viewer";
    els.composerStatus.textContent = "SIGN IN TO POST";
    els.composerAvatar.textContent = "R";
    els.postBtn.disabled = true;
    setStatus("SIGN IN REQUIRED TO POST — FEED CAN STILL LOAD");
    return;
  }

  els.postBtn.disabled = false;
  await loadProfile();
  await loadCurrentMetaAvatar();
  renderComposer();
  saveIdentityCache();
}

async function loadProfile() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.warn("Profile load skipped:", error.message);
    currentProfile = null;
    return;
  }

  currentProfile = data || null;
}

async function loadCurrentMetaAvatar() {
  if (!currentUser) return;

  const { data, error } = await supabase
    .from("meta_avatars")
    .select("*")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.warn("Current meta avatar skipped:", error.message);
    currentMetaAvatar = null;
    return;
  }

  currentMetaAvatar = data || null;
}

function renderComposer() {
  const name = getProfileName(currentProfile, currentUser);
  const username = getUsername(currentProfile, currentUser);
  const metaText = currentMetaAvatar?.avatar_type
    ? `SIGNED IN · @${username} · ${String(currentMetaAvatar.avatar_type).toUpperCase()} AVATAR`
    : `SIGNED IN CREATOR · @${username}`;

  els.composerName.textContent = name;
  els.composerStatus.textContent = metaText;
  els.composerAvatar.innerHTML = avatarHtml(currentProfile, currentUser, currentMetaAvatar);
}

async function loadProfilesForPosts() {
  profilesById = new Map();
  metaByUserId = new Map();

  const userIds = [...new Set(posts.map((p) => p.user_id).filter(Boolean))];
  if (!userIds.length) return;

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .in("id", userIds);

  if (!profileError) {
    for (const profile of profiles || []) {
      profilesById.set(profile.id, profile);
    }
  } else {
    console.warn("Profiles for feed skipped:", profileError.message);
  }

  const { data: metas, error: metaError } = await supabase
    .from("meta_avatars")
    .select("*")
    .in("user_id", userIds);

  if (!metaError) {
    for (const meta of metas || []) {
      metaByUserId.set(meta.user_id, meta);
    }
  } else {
    console.warn("Meta avatars for feed skipped:", metaError.message);
  }
}

async function loadLikedPosts() {
  likedPostIds = new Set();

  if (!currentUser) return;

  const { data, error } = await supabase
    .from("feed_post_likes")
    .select("post_id")
    .eq("user_id", currentUser.id);

  if (error) {
    console.warn("Liked posts load error:", error.message);
    return;
  }

  likedPostIds = new Set((data || []).map((row) => row.post_id));
}

async function loadPosts() {
  setStatus("LOADING REALTIME FEED...");

  const { data, error } = await supabase
    .from("feed_posts")
    .select("*")
    .or("visibility.eq.public,visibility.is.null")
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) {
    console.error("Feed load error:", error);
    setStatus(`FEED ERROR: ${error.message}`);
    els.feedList.innerHTML = `<div class="empty">Feed could not load. Check feed_posts RLS policies.</div>`;
    return;
  }

  posts = data || [];
  await loadProfilesForPosts();
  renderFeed();

  setStatus(posts.length ? "REALTIME FEED LIVE" : "NO POSTS YET — CREATE THE FIRST DROP");
}

function renderFeed() {
  if (!els.feedList) return;

  if (!posts.length) {
    els.feedList.innerHTML = `<div class="empty">No posts yet. Drop the first Rich Bizness update.</div>`;
    return;
  }

  els.feedList.innerHTML = posts.map((post) => {
    const profile = profilesById.get(post.user_id) || null;
    const meta = metaByUserId.get(post.user_id) || null;
    const name = getProfileName(profile, null);
    const username = getUsername(profile, null);
    const liked = likedPostIds.has(post.id);
    const section = getPostSection(post);

    return `
      <article class="post-card" data-post-id="${escapeHtml(post.id)}">
        <div class="post-head">
          <div class="avatar">${avatarHtml(profile, null, meta)}</div>
          <div class="post-user">
            <strong>${escapeHtml(name)}</strong>
            <small>
              @${escapeHtml(username)} · ${formatDate(post.created_at)} · ${escapeHtml(section)}
              ${tinyMetaAvatar(meta)}
            </small>
          </div>
        </div>

        <div style="color:#9dff67;font-size:11px;letter-spacing:.14em;font-weight:950;margin-bottom:10px;">
          ${getPostBadge(post)}
        </div>

        ${post.body ? `<div class="post-body">${escapeHtml(post.body)}</div>` : ""}
        ${mediaHtml(post)}

        <div class="post-actions">
          <button class="action-btn ${liked ? "is-liked" : ""}" data-action="like" data-post-id="${escapeHtml(post.id)}" type="button">
            ${liked ? "💚" : "♡"} ${post.like_count || 0}
          </button>
          <button class="action-btn" data-action="comment" data-post-id="${escapeHtml(post.id)}" type="button">
            💬 ${post.comment_count || 0}
          </button>
          <button class="action-btn" data-action="repost" data-post-id="${escapeHtml(post.id)}" type="button">
            🔁 ${post.repost_count || 0}
          </button>
          <button class="action-btn" data-action="view" data-post-id="${escapeHtml(post.id)}" type="button">
            👁 ${post.view_count || 0}
          </button>
        </div>
      </article>
    `;
  }).join("");
}

async function createPost() {
  if (!currentUser) {
    window.location.href = "/auth.html";
    return;
  }

  const body = els.postBody.value.trim();
  const mediaUrl = els.mediaUrl.value.trim();
  const mediaType = els.mediaType.value || "text";

  if (!body && !mediaUrl) {
    setStatus("WRITE SOMETHING OR ADD MEDIA FIRST");
    return;
  }

  els.postBtn.disabled = true;
  setStatus("POSTING...");

  const { error } = await supabase.from("feed_posts").insert({
    user_id: currentUser.id,
    body: body || null,
    media_url: mediaUrl || null,
    media_type: mediaUrl ? mediaType : "text",
    thumbnail_url: mediaType === "image" ? mediaUrl : null,
    section: "feed",
    visibility: "public",
    like_count: 0,
    comment_count: 0,
    repost_count: 0,
    view_count: 0,
    is_featured: false,
    is_pinned: false,
    metadata: {
      source: "feed.html",
      app: "Rich Bizness Mobile",
      profile_username: getUsername(currentProfile, currentUser),
      profile_avatar_url: currentProfile?.avatar_url || null,
      meta_avatar_id: currentMetaAvatar?.id || null,
      avatar_type: currentMetaAvatar?.avatar_type || null,
      avatar_config: currentMetaAvatar?.metadata?.avatar_config || currentMetaAvatar?.outfit || null
    }
  });

  if (error) {
    setStatus(`POST ERROR: ${error.message}`);
    els.postBtn.disabled = false;
    return;
  }

  els.postBody.value = "";
  els.mediaUrl.value = "";
  els.mediaType.value = "text";
  els.postBtn.disabled = false;

  await loadPosts();
  setStatus("POST LIVE");
}

async function toggleLike(postId) {
  if (!currentUser) {
    window.location.href = "/auth.html";
    return;
  }

  const alreadyLiked = likedPostIds.has(postId);
  const post = posts.find((item) => item.id === postId);
  const nextCount = Math.max(0, Number(post?.like_count || 0) + (alreadyLiked ? -1 : 1));

  if (alreadyLiked) {
    await supabase
      .from("feed_post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", currentUser.id);
  } else {
    await supabase
      .from("feed_post_likes")
      .insert({ post_id: postId, user_id: currentUser.id });
  }

  await supabase
    .from("feed_posts")
    .update({ like_count: nextCount })
    .eq("id", postId);

  await loadLikedPosts();
  await loadPosts();
}

async function recordView(postId) {
  const sessionId = localStorage.getItem("rb_feed_session_id") || crypto.randomUUID();
  localStorage.setItem("rb_feed_session_id", sessionId);

  await supabase.from("feed_post_views").insert({
    post_id: postId,
    user_id: currentUser?.id || null,
    session_id: sessionId
  });

  const post = posts.find((item) => item.id === postId);

  await supabase
    .from("feed_posts")
    .update({ view_count: Number(post?.view_count || 0) + 1 })
    .eq("id", postId);
}

function openComments(postId) {
  const text = prompt("Drop a comment:");
  if (!text || !text.trim()) return;
  createComment(postId, text.trim());
}

async function createComment(postId, body) {
  if (!currentUser) {
    window.location.href = "/auth.html";
    return;
  }

  const post = posts.find((item) => item.id === postId);
  const nextCount = Number(post?.comment_count || 0) + 1;

  const { error } = await supabase
    .from("feed_comments")
    .insert({ post_id: postId, user_id: currentUser.id, body });

  if (error) {
    setStatus(`COMMENT ERROR: ${error.message}`);
    return;
  }

  await supabase
    .from("feed_posts")
    .update({ comment_count: nextCount })
    .eq("id", postId);

  await loadPosts();
  setStatus("COMMENT POSTED");
}

async function repostPost(postId) {
  if (!currentUser) {
    window.location.href = "/auth.html";
    return;
  }

  const original = posts.find((item) => item.id === postId);
  if (!original) return;

  const { error } = await supabase.from("feed_posts").insert({
    user_id: currentUser.id,
    body: `Reposted: ${original.body || "Rich Bizness drop"}`,
    media_url: original.media_url || null,
    media_type: original.media_type || "text",
    section: "feed",
    visibility: "public",
    metadata: {
      source: "feed_repost",
      original_post_id: postId
    }
  });

  if (error) {
    setStatus(`REPOST ERROR: ${error.message}`);
    return;
  }

  await supabase
    .from("feed_posts")
    .update({ repost_count: Number(original.repost_count || 0) + 1 })
    .eq("id", postId);

  await loadPosts();
  setStatus("REPOST LIVE");
}

function startRealtime() {
  if (realtimeChannel) supabase.removeChannel(realtimeChannel);

  realtimeChannel = supabase
    .channel("rich-bizness-mobile-feed-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "feed_posts" }, loadPosts)
    .on("postgres_changes", { event: "*", schema: "public", table: "feed_post_likes" }, async () => {
      await loadLikedPosts();
      await loadPosts();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "feed_comments" }, loadPosts)
    .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, loadPosts)
    .on("postgres_changes", { event: "*", schema: "public", table: "meta_avatars" }, loadPosts)
    .subscribe((status) => {
      if (status === "SUBSCRIBED") setStatus("REALTIME CONNECTED");
    });
}

els.postBtn?.addEventListener("click", createPost);

els.postBody?.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") createPost();
});

els.feedList?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const postId = button.dataset.postId;
  if (!postId) return;

  if (action === "like") await toggleLike(postId);
  if (action === "comment") openComments(postId);
  if (action === "view") {
    await recordView(postId);
    await loadPosts();
  }
  if (action === "repost") await repostPost(postId);
});

window.addEventListener("rb:identity-updated", async () => {
  await loadProfile();
  await loadCurrentMetaAvatar();
  renderComposer();
  await loadPosts();
});

async function bootFeed() {
  setStatus("BOOTING FEED...");
  await loadUser();
  await loadLikedPosts();
  await loadPosts();
  startRealtime();
}

bootFeed();
