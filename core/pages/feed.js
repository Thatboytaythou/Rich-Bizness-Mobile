import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================
   RICH BIZNESS MOBILE FEED
   /core/pages/feed.js
   New Project Realtime Connector
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
let posts = [];
let likedPostIds = new Set();
let realtimeChannel = null;

/* =========================
   HELPERS
========================= */
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

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "JUST NOW";
  if (diff < hour) return `${Math.floor(diff / minute)}M AGO`;
  if (diff < day) return `${Math.floor(diff / hour)}H AGO`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  }).toUpperCase();
}

function getProfileName(profile, user) {
  return (
    profile?.username ||
    user?.user_metadata?.username ||
    user?.user_metadata?.display_name ||
    user?.email?.split("@")[0] ||
    "Rich Creator"
  );
}

function getInitial(name = "R") {
  return String(name || "R").trim().slice(0, 1).toUpperCase();
}

function avatarHtml(profile, user) {
  const name = getProfileName(profile, user);
  return escapeHtml(getInitial(name));
}

function mediaHtml(post) {
  if (!post.media_url) return "";

  const url = escapeHtml(post.media_url);
  const type = post.media_type || "text";

  if (type === "image") {
    return `<img class="post-media" src="${url}" alt="Feed media" loading="lazy" />`;
  }

  if (type === "video") {
    return `<video class="post-media" src="${url}" controls playsinline preload="metadata"></video>`;
  }

  return "";
}

/* =========================
   AUTH + PROFILE
========================= */
async function loadUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.warn("Feed auth error:", error);
  }

  currentUser = data?.user || null;

  if (!currentUser) {
    currentProfile = null;

    els.composerName.textContent = "Guest Viewer";
    els.composerStatus.textContent = "SIGN IN TO POST";
    els.composerAvatar.textContent = "R";
    els.postBtn.disabled = true;

    setStatus("SIGN IN REQUIRED TO POST — FEED CAN STILL LOAD");
    return;
  }

  els.postBtn.disabled = false;

  await loadProfile();
}

async function loadProfile() {
  if (!currentUser) return;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, created_at")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.warn("Profile load error:", error);
  }

  currentProfile = data || null;

  const name = getProfileName(currentProfile, currentUser);

  els.composerName.textContent = name;
  els.composerStatus.textContent = "SIGNED IN CREATOR";
  els.composerAvatar.innerHTML = avatarHtml(currentProfile, currentUser);
}

/* =========================
   FEED LOAD
========================= */
async function loadLikedPosts() {
  likedPostIds = new Set();

  if (!currentUser) return;

  const { data, error } = await supabase
    .from("feed_post_likes")
    .select("post_id")
    .eq("user_id", currentUser.id);

  if (error) {
    console.warn("Liked posts load error:", error);
    return;
  }

  likedPostIds = new Set((data || []).map((row) => row.post_id));
}

async function loadPosts() {
  setStatus("LOADING REALTIME FEED...");

  const { data, error } = await supabase
    .from("feed_posts")
    .select(`
      *,
      profiles:user_id (
        id,
        username,
        created_at
      )
    `)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    console.error("Feed load error:", error);
    setStatus(`FEED ERROR: ${error.message}`);

    els.feedList.innerHTML = `
      <div class="empty">
        Feed could not load. Check feed_posts, profiles, and RLS policies.
      </div>
    `;

    return;
  }

  posts = data || [];
  renderFeed();

  setStatus(posts.length ? "REALTIME FEED LIVE" : "NO POSTS YET — CREATE THE FIRST DROP");
}

/* =========================
   RENDER
========================= */
function renderFeed() {
  if (!els.feedList) return;

  if (!posts.length) {
    els.feedList.innerHTML = `
      <div class="empty">
        No posts yet. Drop the first Rich Bizness update.
      </div>
    `;
    return;
  }

  els.feedList.innerHTML = posts
    .map((post) => {
      const profile = post.profiles || null;
      const name = getProfileName(profile, null);
      const liked = likedPostIds.has(post.id);

      return `
        <article class="post-card" data-post-id="${escapeHtml(post.id)}">

          <div class="post-head">
            <div class="avatar">${avatarHtml(profile, null)}</div>

            <div class="post-user">
              <strong>${escapeHtml(name)}</strong>
              <small>${formatDate(post.created_at)} · ${escapeHtml((post.section || "feed").toUpperCase())}</small>
            </div>
          </div>

          ${
            post.body
              ? `<div class="post-body">${escapeHtml(post.body)}</div>`
              : ""
          }

          ${mediaHtml(post)}

          <div class="post-actions">
            <button
              class="action-btn ${liked ? "is-liked" : ""}"
              data-action="like"
              data-post-id="${escapeHtml(post.id)}"
              type="button"
            >
              ${liked ? "💚" : "♡"} ${post.like_count || 0}
            </button>

            <button
              class="action-btn"
              data-action="comment"
              data-post-id="${escapeHtml(post.id)}"
              type="button"
            >
              💬 ${post.comment_count || 0}
            </button>

            <button
              class="action-btn"
              data-action="repost"
              data-post-id="${escapeHtml(post.id)}"
              type="button"
            >
              🔁 ${post.repost_count || 0}
            </button>

            <button
              class="action-btn"
              data-action="view"
              data-post-id="${escapeHtml(post.id)}"
              type="button"
            >
              👁 ${post.view_count || 0}
            </button>
          </div>

        </article>
      `;
    })
    .join("");
}

/* =========================
   CREATE POST
========================= */
async function createPost() {
  if (!currentUser) {
    setStatus("SIGN IN FIRST TO POST");
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

  const { error } = await supabase
    .from("feed_posts")
    .insert({
      user_id: currentUser.id,
      body: body || null,
      media_url: mediaUrl || null,
      media_type: mediaUrl ? mediaType : "text",
      section: "feed",
      visibility: "public",
      metadata: {
        source: "feed.html",
        app: "Rich Bizness Mobile"
      }
    });

  if (error) {
    console.error("Post create error:", error);
    setStatus(`POST ERROR: ${error.message}`);
    els.postBtn.disabled = false;
    return;
  }

  els.postBody.value = "";
  els.mediaUrl.value = "";
  els.mediaType.value = "text";

  setStatus("POST LIVE");
  els.postBtn.disabled = false;

  await loadPosts();
}

/* =========================
   LIKE / VIEW / COMMENT
========================= */
async function toggleLike(postId) {
  if (!currentUser) {
    setStatus("SIGN IN TO LIKE POSTS");
    window.location.href = "/auth.html";
    return;
  }

  const alreadyLiked = likedPostIds.has(postId);

  if (alreadyLiked) {
    likedPostIds.delete(postId);
    renderFeed();

    const { error } = await supabase
      .from("feed_post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", currentUser.id);

    if (error) {
      console.error("Unlike error:", error);
      setStatus(`UNLIKE ERROR: ${error.message}`);
      await loadLikedPosts();
      await loadPosts();
    }

    return;
  }

  likedPostIds.add(postId);
  renderFeed();

  const { error } = await supabase
    .from("feed_post_likes")
    .insert({
      post_id: postId,
      user_id: currentUser.id
    });

  if (error) {
    console.error("Like error:", error);
    likedPostIds.delete(postId);
    setStatus(`LIKE ERROR: ${error.message}`);
    renderFeed();
  }
}

async function recordView(postId) {
  const sessionId =
    localStorage.getItem("rb_feed_session_id") ||
    crypto.randomUUID();

  localStorage.setItem("rb_feed_session_id", sessionId);

  const { error: viewError } = await supabase
    .from("feed_post_views")
    .insert({
      post_id: postId,
      user_id: currentUser?.id || null,
      session_id: sessionId
    });

  if (viewError) {
    console.warn("View insert error:", viewError);
  }

  const post = posts.find((item) => item.id === postId);
  const nextViewCount = (post?.view_count || 0) + 1;

  const { error: updateError } = await supabase
    .from("feed_posts")
    .update({
      view_count: nextViewCount
    })
    .eq("id", postId);

  if (updateError) {
    console.warn("View count update error:", updateError);
  }
}

function openComments(postId) {
  const text = prompt("Drop a comment:");

  if (!text || !text.trim()) return;

  createComment(postId, text.trim());
}

async function createComment(postId, body) {
  if (!currentUser) {
    setStatus("SIGN IN TO COMMENT");
    window.location.href = "/auth.html";
    return;
  }

  const { error } = await supabase
    .from("feed_comments")
    .insert({
      post_id: postId,
      user_id: currentUser.id,
      body
    });

  if (error) {
    console.error("Comment error:", error);
    setStatus(`COMMENT ERROR: ${error.message}`);
    return;
  }

  setStatus("COMMENT POSTED");
  await loadPosts();
}

/* =========================
   REALTIME
========================= */
function startRealtime() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }

  realtimeChannel = supabase
    .channel("rich-bizness-mobile-feed-realtime")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "feed_posts"
      },
      async () => {
        await loadPosts();
      }
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "feed_post_likes"
      },
      async () => {
        await loadLikedPosts();
        await loadPosts();
      }
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "feed_comments"
      },
      async () => {
        await loadPosts();
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setStatus("REALTIME CONNECTED");
      }
    });
}

/* =========================
   EVENTS
========================= */
els.postBtn?.addEventListener("click", createPost);

els.postBody?.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    createPost();
  }
});

els.feedList?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const postId = button.dataset.postId;

  if (!postId) return;

  if (action === "like") {
    await toggleLike(postId);
    return;
  }

  if (action === "comment") {
    openComments(postId);
    return;
  }

  if (action === "view") {
    await recordView(postId);
    await loadPosts();
    return;
  }

  if (action === "repost") {
    setStatus("REPOST ENGINE COMING NEXT");
  }
});

/* =========================
   BOOT
========================= */
async function bootFeed() {
  setStatus("BOOTING FEED...");

  await loadUser();
  await loadLikedPosts();
  await loadPosts();

  startRealtime();
}

bootFeed();
