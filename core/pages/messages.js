import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================
   RICH BIZNESS MOBILE MESSAGES
   /core/pages/messages.js
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
  statThreads: $("statThreads"),
  statMessages: $("statMessages"),
  statActive: $("statActive"),
  statStatus: $("statStatus"),

  recipientInput: $("recipientInput"),
  threadTitleInput: $("threadTitleInput"),
  startThreadBtn: $("startThreadBtn"),
  messagesStatus: $("messagesStatus"),

  threadsList: $("threadsList"),
  activeAvatar: $("activeAvatar"),
  activeTitle: $("activeTitle"),
  activeSub: $("activeSub"),
  messagesList: $("messagesList"),
  messageInput: $("messageInput"),
  mediaInput: $("mediaInput"),
  sendBtn: $("sendBtn")
};

let currentUser = null;
let currentProfile = null;
let threads = [];
let members = [];
let messages = [];
let reactions = [];
let profilesById = new Map();
let activeThreadId = null;
let realtimeChannel = null;

function setStatus(message, mode = "ready") {
  if (els.messagesStatus) els.messagesStatus.textContent = message || "";
  if (els.statStatus) els.statStatus.textContent = mode.toUpperCase();
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getInitial(value = "M") {
  return String(value || "M").trim().slice(0, 1).toUpperCase();
}

function formatTime(value) {
  if (!value) return "JUST NOW";

  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minute = 60000;
  const hour = minute * 60;
  const day = hour * 24;

  if (diff < minute) return "JUST NOW";
  if (diff < hour) return `${Math.floor(diff / minute)}M AGO`;
  if (diff < day) return `${Math.floor(diff / hour)}H AGO`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  }).toUpperCase();
}

function profileName(userId) {
  const profile = profilesById.get(userId);

  return (
    profile?.username ||
    profile?.display_name ||
    (userId === currentUser?.id ? currentUser?.email?.split("@")[0] : null) ||
    "Rich Creator"
  );
}

function getThreadMembers(threadId) {
  return members.filter((member) => member.thread_id === threadId);
}

function getOtherMember(threadId) {
  return getThreadMembers(threadId).find((member) => member.user_id !== currentUser?.id);
}

function getThreadTitle(thread) {
  if (thread?.title) return thread.title;

  const other = getOtherMember(thread.id);
  if (other?.user_id) return profileName(other.user_id);

  return "Rich Bizness Chat";
}

function updateStats() {
  els.statThreads.textContent = threads.length.toLocaleString();
  els.statMessages.textContent = messages.length.toLocaleString();
  els.statActive.textContent = activeThreadId ? "LIVE" : "NONE";
}

/* =========================
   AUTH
========================= */
async function loadUser() {
  const { data } = await supabase.auth.getUser();
  currentUser = data?.user || null;

  if (!currentUser) {
    setStatus("SIGN IN REQUIRED FOR MESSAGES", "locked");
    setTimeout(() => {
      window.location.href = "/auth.html";
    }, 700);
    return false;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("id", currentUser.id)
    .maybeSingle();

  currentProfile = profile || null;
  profilesById.set(currentUser.id, currentProfile || {
    id: currentUser.id,
    username: currentUser.email?.split("@")[0] || "You"
  });

  return true;
}

/* =========================
   LOAD THREADS
========================= */
async function loadThreads() {
  const { data: myMemberships, error: memberError } = await supabase
    .from("dm_thread_members")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("joined_at", { ascending: false });

  if (memberError) {
    console.warn("Thread membership error:", memberError);
    setStatus(`THREAD ERROR: ${memberError.message}`, "error");
    return;
  }

  const threadIds = (myMemberships || []).map((row) => row.thread_id);

  if (!threadIds.length) {
    threads = [];
    members = [];
    messages = [];
    renderThreads();
    renderMessages();
    updateStats();
    setStatus("NO THREADS YET — START A CHAT", "ready");
    return;
  }

  const { data: threadData, error: threadError } = await supabase
    .from("dm_threads")
    .select("*")
    .in("id", threadIds)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (threadError) {
    console.warn("Threads error:", threadError);
    setStatus(`THREAD ERROR: ${threadError.message}`, "error");
    return;
  }

  const { data: allMembers, error: allMembersError } = await supabase
    .from("dm_thread_members")
    .select("*")
    .in("thread_id", threadIds);

  if (allMembersError) {
    console.warn("Members load error:", allMembersError);
  }

  threads = threadData || [];
  members = allMembers || [];

  await loadProfilesForMembers();

  if (!activeThreadId && threads[0]) {
    activeThreadId = threads[0].id;
  }

  renderThreads();
  await loadMessages();
  updateStats();
}

async function loadProfilesForMembers() {
  const ids = [
    ...new Set(
      members
        .map((member) => member.user_id)
        .filter(Boolean)
    )
  ];

  if (!ids.length) return;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", ids);

  if (error) {
    console.warn("Profiles skipped:", error.message);
    return;
  }

  for (const profile of data || []) {
    profilesById.set(profile.id, profile);
  }
}

/* =========================
   LOAD MESSAGES
========================= */
async function loadMessages() {
  if (!activeThreadId) {
    messages = [];
    reactions = [];
    renderMessages();
    updateStats();
    return;
  }

  const { data, error } = await supabase
    .from("dm_messages")
    .select("*")
    .eq("thread_id", activeThreadId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    console.warn("Messages load error:", error);
    setStatus(`MESSAGE ERROR: ${error.message}`, "error");
    return;
  }

  messages = data || [];
  await loadReactions();

  renderThreads();
  renderMessages();
  updateStats();

  await markThreadRead(activeThreadId);
}

async function loadReactions() {
  if (!messages.length) {
    reactions = [];
    return;
  }

  const ids = messages.map((message) => message.id);

  const { data, error } = await supabase
    .from("dm_message_reactions")
    .select("*")
    .in("message_id", ids);

  if (error) {
    console.warn("Reactions load error:", error);
    reactions = [];
    return;
  }

  reactions = data || [];
}

async function markThreadRead(threadId) {
  await supabase
    .from("dm_thread_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("thread_id", threadId)
    .eq("user_id", currentUser.id);
}

/* =========================
   RENDER THREADS
========================= */
function renderThreads() {
  if (!threads.length) {
    els.threadsList.innerHTML = `<div class="empty">No message threads yet. Start your first Rich Bizness chat.</div>`;
    return;
  }

  els.threadsList.innerHTML = threads.map((thread) => {
    const title = getThreadTitle(thread);
    const last = thread.last_message || "No messages yet.";
    const active = thread.id === activeThreadId ? "active" : "";
    const other = getOtherMember(thread.id);
    const avatarName = other?.user_id ? profileName(other.user_id) : title;

    return `
      <button class="thread ${active}" data-thread="${thread.id}" type="button">
        <div class="avatar">${escapeHtml(getInitial(avatarName))}</div>
        <div>
          <strong>${escapeHtml(title)}</strong>
          <small>${formatTime(thread.last_message_at || thread.created_at)}</small>
          <p>${escapeHtml(last)}</p>
        </div>
      </button>
    `;
  }).join("");

  const active = threads.find((thread) => thread.id === activeThreadId);

  if (active) {
    const title = getThreadTitle(active);
    els.activeTitle.textContent = title;
    els.activeAvatar.textContent = getInitial(title);
    els.activeSub.textContent = `${messages.length} messages · realtime connected`;
  }
}

/* =========================
   RENDER MESSAGES
========================= */
function messageMediaHtml(message) {
  if (!message.media_url) return "";

  const url = escapeHtml(message.media_url);
  const type = message.media_type || "file";

  if (type === "image") {
    return `<img class="msg-media" src="${url}" alt="Message media" loading="lazy" />`;
  }

  if (type === "video") {
    return `<video class="msg-media" src="${url}" controls playsinline preload="metadata"></video>`;
  }

  if (type === "audio") {
    return `<audio src="${url}" controls style="width:100%;margin-top:8px;"></audio>`;
  }

  return `<a href="${url}" target="_blank" style="display:block;color:#9dff67;margin-top:8px;">Open media</a>`;
}

function reactionsForMessage(messageId) {
  const items = reactions.filter((reaction) => reaction.message_id === messageId);

  if (!items.length) return "";

  const grouped = items.reduce((acc, reaction) => {
    acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
    return acc;
  }, {});

  return `
    <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
      ${Object.entries(grouped).map(([emoji, count]) => `
        <button class="small-btn" data-react-message="${messageId}" data-emoji="${escapeHtml(emoji)}" type="button">
          ${escapeHtml(emoji)} ${count}
        </button>
      `).join("")}
    </div>
  `;
}

function renderMessages() {
  if (!activeThreadId) {
    els.messagesList.innerHTML = `<div class="empty">Pick a thread or start a new message.</div>`;
    els.activeTitle.textContent = "SELECT A CHAT";
    els.activeAvatar.textContent = "M";
    els.activeSub.textContent = "Realtime chat ready.";
    return;
  }

  if (!messages.length) {
    els.messagesList.innerHTML = `<div class="empty">No messages yet. Send the first one.</div>`;
    return;
  }

  els.messagesList.innerHTML = messages.map((message) => {
    const mine = message.sender_id === currentUser.id;
    const name = mine ? "YOU" : profileName(message.sender_id);

    return `
      <div class="msg ${mine ? "mine" : ""}" data-message="${message.id}">
        <small>${escapeHtml(name)} · ${formatTime(message.created_at)}</small>
        ${message.body ? `<p>${escapeHtml(message.body)}</p>` : ""}
        ${messageMediaHtml(message)}
        ${reactionsForMessage(message.id)}
      </div>
    `;
  }).join("");

  els.messagesList.scrollTop = els.messagesList.scrollHeight;
}

/* =========================
   CREATE THREAD
========================= */
async function startThread() {
  const recipientId = els.recipientInput.value.trim();
  const title = els.threadTitleInput.value.trim();

  if (!recipientId) {
    setStatus("PASTE A USER UUID TO START CHAT", "missing");
    return;
  }

  if (recipientId === currentUser.id) {
    setStatus("YOU CAN’T MESSAGE YOURSELF HERE", "error");
    return;
  }

  els.startThreadBtn.disabled = true;
  setStatus("CREATING THREAD...", "saving");

  const { data: thread, error: threadError } = await supabase
    .from("dm_threads")
    .insert({
      title: title || null,
      thread_type: "direct",
      created_by: currentUser.id,
      metadata: {
        source: "messages.html"
      }
    })
    .select("*")
    .single();

  if (threadError || !thread) {
    setStatus(`THREAD ERROR: ${threadError?.message || "Create failed"}`, "error");
    els.startThreadBtn.disabled = false;
    return;
  }

  const { error: memberError } = await supabase
    .from("dm_thread_members")
    .insert([
      {
        thread_id: thread.id,
        user_id: currentUser.id,
        role: "owner"
      },
      {
        thread_id: thread.id,
        user_id: recipientId,
        role: "member"
      }
    ]);

  if (memberError) {
    setStatus(`MEMBER ERROR: ${memberError.message}`, "error");
    els.startThreadBtn.disabled = false;
    return;
  }

  activeThreadId = thread.id;
  els.recipientInput.value = "";
  els.threadTitleInput.value = "";
  els.startThreadBtn.disabled = false;

  await loadThreads();
  setStatus("THREAD CREATED", "live");
}

/* =========================
   SEND MESSAGE
========================= */
function getMediaType(url) {
  const lower = String(url || "").toLowerCase();

  if (!lower) return "text";
  if (lower.match(/\.(png|jpg|jpeg|gif|webp|heic|heif)$/)) return "image";
  if (lower.match(/\.(mp4|mov|webm|m4v)$/)) return "video";
  if (lower.match(/\.(mp3|m4a|wav|aac)$/)) return "audio";

  return "file";
}

async function sendMessage() {
  if (!activeThreadId) {
    setStatus("SELECT A THREAD FIRST", "missing");
    return;
  }

  const body = els.messageInput.value.trim();
  const mediaUrl = els.mediaInput.value.trim();

  if (!body && !mediaUrl) {
    setStatus("TYPE A MESSAGE OR ADD MEDIA", "missing");
    return;
  }

  els.sendBtn.disabled = true;

  const { data: msg, error } = await supabase
    .from("dm_messages")
    .insert({
      thread_id: activeThreadId,
      sender_id: currentUser.id,
      body: body || null,
      media_url: mediaUrl || null,
      media_type: mediaUrl ? getMediaType(mediaUrl) : "text"
    })
    .select("*")
    .single();

  if (error || !msg) {
    setStatus(`SEND ERROR: ${error?.message || "Message failed"}`, "error");
    els.sendBtn.disabled = false;
    return;
  }

  await supabase
    .from("dm_threads")
    .update({
      last_message: body || mediaUrl || "Media message",
      last_message_at: new Date().toISOString(),
      last_message_user_id: currentUser.id,
      updated_at: new Date().toISOString()
    })
    .eq("id", activeThreadId);

  els.messageInput.value = "";
  els.mediaInput.value = "";
  els.sendBtn.disabled = false;

  await loadThreads();
  setStatus("MESSAGE SENT", "live");
}

/* =========================
   REACTIONS
========================= */
async function reactToLatest(emoji) {
  const latest = [...messages].reverse().find(Boolean);

  if (!latest) {
    setStatus("NO MESSAGE TO REACT TO", "missing");
    return;
  }

  await reactToMessage(latest.id, emoji);
}

async function reactToMessage(messageId, emoji) {
  if (!messageId || !emoji) return;

  const already = reactions.some(
    (reaction) =>
      reaction.message_id === messageId &&
      reaction.user_id === currentUser.id &&
      reaction.emoji === emoji
  );

  if (already) {
    await supabase
      .from("dm_message_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", currentUser.id)
      .eq("emoji", emoji);
  } else {
    await supabase
      .from("dm_message_reactions")
      .insert({
        message_id: messageId,
        user_id: currentUser.id,
        emoji
      });
  }

  await loadMessages();
}

/* =========================
   REALTIME
========================= */
function startRealtime() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }

  realtimeChannel = supabase
    .channel("rich-bizness-messages")
    .on("postgres_changes", { event: "*", schema: "public", table: "dm_threads" }, async () => {
      await loadThreads();
      setStatus("THREADS UPDATED LIVE", "live");
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "dm_thread_members" }, async () => {
      await loadThreads();
      setStatus("MEMBERS UPDATED LIVE", "live");
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "dm_messages" }, async () => {
      await loadThreads();
      await loadMessages();
      setStatus("MESSAGES UPDATED LIVE", "live");
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "dm_message_reactions" }, async () => {
      await loadMessages();
      setStatus("REACTIONS UPDATED LIVE", "live");
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setStatus("MESSAGES REALTIME CONNECTED", "ready");
      }
    });
}

/* =========================
   EVENTS
========================= */
els.startThreadBtn?.addEventListener("click", startThread);
els.sendBtn?.addEventListener("click", sendMessage);

els.messageInput?.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    sendMessage();
  }
});

els.threadsList?.addEventListener("click", async (event) => {
  const thread = event.target.closest("[data-thread]");
  if (!thread) return;

  activeThreadId = thread.dataset.thread;
  await loadMessages();
  renderThreads();
});

document.addEventListener("click", async (event) => {
  const emojiBtn = event.target.closest("[data-emoji]");
  const reactMessage = event.target.closest("[data-react-message]");

  if (reactMessage) {
    await reactToMessage(reactMessage.dataset.reactMessage, reactMessage.dataset.emoji);
    return;
  }

  if (emojiBtn && !emojiBtn.dataset.reactMessage) {
    await reactToLatest(emojiBtn.dataset.emoji);
  }
});

/* =========================
   BOOT
========================= */
async function bootMessages() {
  setStatus("BOOTING MESSAGES...", "boot");

  const ok = await loadUser();
  if (!ok) return;

  await loadThreads();

  startRealtime();
  updateStats();

  setStatus("MESSAGES READY", "ready");
}

bootMessages();
