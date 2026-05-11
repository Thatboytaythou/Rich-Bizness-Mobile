import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================
   RICH BIZNESS MOBILE WATCH
   /core/pages/watch.js
========================= */

const SUPABASE_URL = "https://zsancpcyhdidrlezggrl.supabase.co";
const SUPABASE_KEY = "sb_publishable_Hahozdb2FpB9cDsoWEEJzQ_WA_xdWV2";
const LIVEKIT_URL = "wss://rich-bizness-mobile-zvq5cojk.livekit.cloud";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

const LK = window.LivekitClient;
const $ = (id) => document.getElementById(id);

const els = {
  watchTitle: $("watchTitle"),
  watchDescription: $("watchDescription"),

  statStatus: $("statStatus"),
  statViewers: $("statViewers"),
  statChat: $("statChat"),
  statReactions: $("statReactions"),

  watchVideo: $("watchVideo"),
  videoEmpty: $("videoEmpty"),
  emptyText: $("emptyText"),
  liveBadge: $("liveBadge"),
  accessBadge: $("accessBadge"),

  joinBtn: $("joinBtn"),
  latestBtn: $("latestBtn"),
  unlockBtn: $("unlockBtn"),
  requestCohostBtn: $("requestCohostBtn"),

  chatBox: $("chatBox"),
  chatInput: $("chatInput"),
  sendChatBtn: $("sendChatBtn"),
  emojiButtons: document.querySelectorAll("[data-emoji]"),

  membersList: $("membersList"),
  vipTitle: $("vipTitle"),
  vipCopy: $("vipCopy"),

  watchStatus: $("watchStatus"),
  moneyStatus: $("moneyStatus")
};

let currentUser = null;
let currentProfile = null;
let currentStream = null;
let currentPurchase = null;
let currentViewSession = null;

let room = null;
let realtimeChannel = null;

let chatMessages = [];
let members = [];

function setStatus(message) {
  if (els.watchStatus) els.watchStatus.textContent = message || "";
}

function setMoneyStatus(message) {
  if (els.moneyStatus) els.moneyStatus.textContent = message || "";
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(cents = 0) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function cleanIdentity(value = "guest") {
  return String(value)
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 70) || "guest";
}

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function getUsername() {
  return (
    currentProfile?.username ||
    currentUser?.email?.split("@")[0] ||
    `guest_${Math.random().toString(16).slice(2, 8)}`
  );
}

function getDisplayName() {
  return (
    currentProfile?.display_name ||
    currentProfile?.username ||
    currentUser?.email?.split("@")[0] ||
    "Guest"
  );
}

function getRoomName() {
  return currentStream?.livekit_room_name || currentStream?.slug || "richbiz-live";
}

function canWatchStream() {
  if (!currentStream) return false;

  const access = currentStream.access_type || "free";
  const price = Number(currentStream.price_cents || 0);

  if (access === "free" || price <= 0) return true;

  if (!currentUser) return false;

  return currentPurchase?.status === "paid";
}

function updateHud() {
  const status = currentStream?.status || "offline";
  const access = currentStream?.access_type || "free";

  els.statStatus.textContent = status.toUpperCase();
  els.statViewers.textContent = Number(currentStream?.viewer_count || members.length || 0).toLocaleString();
  els.statChat.textContent = Number(currentStream?.total_chat_messages || chatMessages.length || 0).toLocaleString();
  els.statReactions.textContent = Number(currentStream?.total_reactions || 0).toLocaleString();

  els.liveBadge.textContent = status === "live" ? "LIVE 🔴" : status.toUpperCase();
  els.accessBadge.textContent = access.toUpperCase();

  els.watchTitle.textContent = currentStream?.title || "Rich Bizness Live";
  els.watchDescription.textContent =
    currentStream?.description ||
    "Watch live streams, VIP rooms, co-host broadcasts, realtime chat, reactions, and Rich Bizness money moments.";

  if (access === "free") {
    els.vipTitle.textContent = "Free Room";
    els.vipCopy.textContent = "This live is free to watch. Tap join and enter the stream.";
  } else {
    els.vipTitle.textContent = `${access.toUpperCase()} Room • ${money(currentStream?.price_cents || 0)}`;
    els.vipCopy.textContent = currentPurchase?.status === "paid"
      ? "VIP access unlocked. You can join this stream."
      : "Unlock VIP access to join this stream. Stripe checkout connects next.";
  }

  if (canWatchStream()) {
    els.videoEmpty.style.display = room ? "none" : "flex";
    els.emptyText.textContent = currentStream?.status === "live"
      ? "Tap JOIN LIVE to enter the stream."
      : "This room is not live yet.";
  } else {
    els.videoEmpty.style.display = "flex";
    els.emptyText.textContent = "VIP or paid access required.";
  }
}

/* =========================
   AUTH / PROFILE
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
   STREAM LOAD
========================= */
async function loadStreamBySlug() {
  const slug = getParam("slug");

  let query = supabase
    .from("live_streams")
    .select("*");

  if (slug) {
    query = query.eq("slug", slug).maybeSingle();
  } else {
    query = query
      .eq("status", "live")
      .order("last_activity_at", { ascending: false })
      .limit(1)
      .maybeSingle();
  }

  const { data, error } = await query;

  if (error) {
    console.warn("Watch stream error:", error);
    setStatus(`STREAM ERROR: ${error.message}`);
    return null;
  }

  currentStream = data || null;

  if (!currentStream) {
    setStatus("NO LIVE STREAM FOUND");
    updateHud();
    return null;
  }

  setStatus("STREAM LOADED");
  updateHud();
  return currentStream;
}

async function findLatestLive() {
  setStatus("FINDING LATEST LIVE...");

  const { data, error } = await supabase
    .from("live_streams")
    .select("*")
    .eq("status", "live")
    .order("last_activity_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    setStatus(`LATEST ERROR: ${error.message}`);
    return;
  }

  if (!data) {
    setStatus("NO ACTIVE LIVE STREAM RIGHT NOW");
    return;
  }

  currentStream = data;

  const url = new URL(window.location.href);
  url.searchParams.set("slug", currentStream.slug);
  window.history.replaceState({}, "", url.toString());

  await afterStreamLoaded();
  setStatus("LATEST LIVE READY");
}

/* =========================
   PURCHASE / ACCESS
========================= */
async function loadPurchase() {
  currentPurchase = null;

  if (!currentUser || !currentStream?.id) return null;

  const { data, error } = await supabase
    .from("live_stream_purchases")
    .select("*")
    .eq("stream_id", currentStream.id)
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("Purchase read error:", error);
    return null;
  }

  currentPurchase = data || null;
  return currentPurchase;
}

async function unlockVip() {
  if (!currentStream) {
    setMoneyStatus("NO STREAM SELECTED");
    return;
  }

  if (!currentUser) {
    window.location.href = "/auth.html";
    return;
  }

  const price = Number(currentStream.price_cents || 0);

  const { data, error } = await supabase
    .from("live_stream_purchases")
    .insert({
      stream_id: currentStream.id,
      user_id: currentUser.id,
      amount_cents: price,
      currency: currentStream.currency || "usd",
      status: price > 0 ? "pending" : "paid",
      purchased_at: price > 0 ? null : new Date().toISOString()
    })
    .select("*")
    .single();

  if (error) {
    setMoneyStatus(`VIP ERROR: ${error.message}`);
    return;
  }

  currentPurchase = data;

  if (price <= 0) {
    setMoneyStatus("VIP UNLOCKED");
  } else {
    setMoneyStatus("VIP CREATED — STRIPE CHECKOUT NEXT");
  }

  updateHud();
}

/* =========================
   VIEW SESSION
========================= */
async function startViewSession() {
  if (!currentStream?.id) return;

  const { data, error } = await supabase
    .from("live_view_sessions")
    .insert({
      stream_id: currentStream.id,
      user_id: currentUser?.id || null,
      username: currentUser ? getUsername() : "guest",
      anonymous_id: currentUser ? null : localStorage.getItem("rb_guest_id") || crypto.randomUUID(),
      metadata: {
        source: "watch.html",
        user_agent: navigator.userAgent
      }
    })
    .select("*")
    .single();

  if (!error) {
    currentViewSession = data;

    if (data.anonymous_id) {
      localStorage.setItem("rb_guest_id", data.anonymous_id);
    }
  }
}

async function endViewSession() {
  if (!currentViewSession?.id) return;

  await supabase
    .from("live_view_sessions")
    .update({
      left_at: new Date().toISOString()
    })
    .eq("id", currentViewSession.id);
}

/* =========================
   LIVEKIT WATCH
========================= */
async function getToken(role = "viewer") {
  const roomName = getRoomName();
  const identity = cleanIdentity(getUsername());

  const url = `/api/livekit-token?room=${encodeURIComponent(roomName)}&username=${encodeURIComponent(identity)}&role=${encodeURIComponent(role)}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || !data.token) {
    throw new Error(data.error || "Missing LiveKit token");
  }

  return data;
}

async function joinLive() {
  if (!LK) {
    setStatus("LIVEKIT CLIENT FAILED TO LOAD");
    return;
  }

  if (!currentStream) {
    await findLatestLive();
  }

  if (!currentStream) return;

  if (currentStream.status !== "live") {
    setStatus("THIS STREAM IS NOT LIVE YET");
    return;
  }

  await loadPurchase();

  if (!canWatchStream()) {
    setMoneyStatus("VIP ACCESS REQUIRED");
    updateHud();
    return;
  }

  try {
    setStatus("JOINING LIVE...");

    if (room) {
      room.disconnect();
      room = null;
    }

    const tokenData = await getToken("viewer");

    room = new LK.Room({
      adaptiveStream: true,
      dynacast: true
    });

    room.on(LK.RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === "video") {
        const element = track.attach();
        element.autoplay = true;
        element.playsInline = true;
        element.controls = true;
        element.id = "watchVideo";

        els.watchVideo.replaceWith(element);
        els.watchVideo = element;
        els.videoEmpty.style.display = "none";
      }

      if (track.kind === "audio") {
        const audio = track.attach();
        audio.autoplay = true;
        document.body.appendChild(audio);
      }
    });

    room.on(LK.RoomEvent.TrackUnsubscribed, (track) => {
      track.detach().forEach((el) => el.remove());
    });

    room.on(LK.RoomEvent.Disconnected, () => {
      setStatus("DISCONNECTED FROM LIVE");
      els.videoEmpty.style.display = "flex";
    });

    await room.connect(LIVEKIT_URL, tokenData.token);

    await startViewSession();

    await supabase
      .from("live_streams")
      .update({
        viewer_count: Number(currentStream.viewer_count || 0) + 1,
        peak_viewers: Math.max(
          Number(currentStream.peak_viewers || 0),
          Number(currentStream.viewer_count || 0) + 1
        ),
        last_activity_at: new Date().toISOString()
      })
      .eq("id", currentStream.id);

    setStatus("WATCHING LIVE 🔥");
    updateHud();
  } catch (error) {
    console.error("Join live error:", error);
    setStatus(`JOIN FAILED: ${error.message}`);
  }
}

/* =========================
   CHAT + REACTIONS
========================= */
async function loadChat() {
  if (!currentStream?.id) {
    chatMessages = [];
    renderChat();
    return;
  }

  const { data, error } = await supabase
    .from("live_chat_messages")
    .select("*")
    .eq("stream_id", currentStream.id)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    console.warn("Chat load error:", error);
    return;
  }

  chatMessages = data || [];
  renderChat();
}

function renderChat() {
  if (!chatMessages.length) {
    els.chatBox.innerHTML = `
      <div class="chat-message">
        <strong>RICH BIZNESS</strong>
        <p>Chat loads when the stream connects.</p>
      </div>
    `;
    return;
  }

  els.chatBox.innerHTML = chatMessages.map((message) => `
    <div class="chat-message">
      <strong>${escapeHtml(message.username || message.display_name || "fan")}</strong>
      <p>${escapeHtml(message.body)}</p>
    </div>
  `).join("");

  els.chatBox.scrollTop = els.chatBox.scrollHeight;
}

async function sendChat() {
  if (!currentStream?.id) {
    setStatus("NO STREAM SELECTED");
    return;
  }

  if (!currentUser) {
    window.location.href = "/auth.html";
    return;
  }

  const body = els.chatInput.value.trim();
  if (!body) return;

  const { error } = await supabase
    .from("live_chat_messages")
    .insert({
      stream_id: currentStream.id,
      user_id: currentUser.id,
      username: getUsername(),
      display_name: getDisplayName(),
      body,
      message_type: "chat"
    });

  if (error) {
    setStatus(`CHAT ERROR: ${error.message}`);
    return;
  }

  els.chatInput.value = "";

  await supabase
    .from("live_streams")
    .update({
      total_chat_messages: Number(currentStream.total_chat_messages || 0) + 1,
      last_activity_at: new Date().toISOString()
    })
    .eq("id", currentStream.id);

  setStatus("CHAT SENT");
}

async function sendReaction(emoji) {
  if (!currentStream?.id) {
    setStatus("NO STREAM SELECTED");
    return;
  }

  const { error } = await supabase
    .from("live_reactions")
    .insert({
      stream_id: currentStream.id,
      user_id: currentUser?.id || null,
      emoji,
      reaction_type: "emoji"
    });

  if (error) {
    setStatus(`REACTION ERROR: ${error.message}`);
    return;
  }

  await supabase
    .from("live_streams")
    .update({
      total_reactions: Number(currentStream.total_reactions || 0) + 1,
      last_activity_at: new Date().toISOString()
    })
    .eq("id", currentStream.id);

  flashEmoji(emoji);
}

function flashEmoji(emoji) {
  const bubble = document.createElement("div");
  bubble.textContent = emoji;
  bubble.style.position = "fixed";
  bubble.style.left = `${30 + Math.random() * 40}%`;
  bubble.style.bottom = "130px";
  bubble.style.zIndex = "999";
  bubble.style.fontSize = "34px";
  bubble.style.pointerEvents = "none";
  bubble.style.transition = "transform 1s ease, opacity 1s ease";
  bubble.style.opacity = "1";

  document.body.appendChild(bubble);

  requestAnimationFrame(() => {
    bubble.style.transform = `translateY(-160px) scale(${1.2 + Math.random()})`;
    bubble.style.opacity = "0";
  });

  setTimeout(() => bubble.remove(), 1100);
}

/* =========================
   MEMBERS / COHOST
========================= */
async function loadMembers() {
  if (!currentStream?.id) {
    members = [];
    renderMembers();
    return;
  }

  const { data, error } = await supabase
    .from("live_stream_members")
    .select("*")
    .eq("stream_id", currentStream.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("Members load error:", error);
    return;
  }

  members = data || [];
  renderMembers();
}

function renderMembers() {
  if (!members.length) {
    els.membersList.innerHTML = `
      <div class="member">
        <strong>Waiting</strong>
        <small>VIEWERS</small>
      </div>
    `;
    return;
  }

  els.membersList.innerHTML = members.map((member) => `
    <div class="member">
      <strong>${escapeHtml(member.display_name || member.username || "Viewer")}</strong>
      <small>${escapeHtml(member.role || "viewer").toUpperCase()}</small>
    </div>
  `).join("");
}

async function requestCohost() {
  if (!currentStream?.id) {
    setStatus("NO STREAM SELECTED");
    return;
  }

  if (!currentUser) {
    window.location.href = "/auth.html";
    return;
  }

  const { error } = await supabase
    .from("live_stream_members")
    .insert({
      stream_id: currentStream.id,
      user_id: currentUser.id,
      username: getUsername(),
      display_name: getDisplayName(),
      role: "cohost_request",
      status: "pending",
      livekit_identity: cleanIdentity(getUsername())
    });

  if (error) {
    setStatus(`CO-HOST ERROR: ${error.message}`);
    return;
  }

  setStatus("CO-HOST REQUEST SENT");
}

/* =========================
   REALTIME
========================= */
function startRealtime() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }

  realtimeChannel = supabase
    .channel("rich-bizness-watch-room")
    .on("postgres_changes", { event: "*", schema: "public", table: "live_streams" }, async (payload) => {
      if (!currentStream?.id) return;
      if (payload.new?.id !== currentStream.id) return;

      currentStream = payload.new;
      updateHud();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "live_chat_messages" }, async (payload) => {
      if (!currentStream?.id) return;
      if (payload.new?.stream_id !== currentStream.id) return;

      await loadChat();
      updateHud();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "live_reactions" }, async (payload) => {
      if (!currentStream?.id) return;
      if (payload.new?.stream_id !== currentStream.id) return;

      flashEmoji(payload.new.emoji || "🔥");
      await loadStreamBySlug();
      updateHud();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "live_stream_members" }, async (payload) => {
      if (!currentStream?.id) return;
      if (payload.new?.stream_id !== currentStream.id) return;

      await loadMembers();
      updateHud();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "live_stream_purchases" }, async (payload) => {
      if (!currentStream?.id) return;
      if (payload.new?.stream_id !== currentStream.id) return;

      await loadPurchase();
      updateHud();
      setMoneyStatus("VIP ACCESS UPDATED");
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setStatus("WATCH REALTIME CONNECTED");
      }
    });
}

/* =========================
   BOOT
========================= */
async function afterStreamLoaded() {
  await loadPurchase();
  await loadChat();
  await loadMembers();
  startRealtime();
  updateHud();
}

async function bootWatch() {
  setStatus("BOOTING WATCH...");

  if (!LK) {
    setStatus("LIVEKIT CLIENT FAILED TO LOAD");
    return;
  }

  await loadUser();
  await loadStreamBySlug();

  if (currentStream) {
    await afterStreamLoaded();
    setStatus("WATCH READY");
  } else {
    setStatus("NO LIVE FOUND — TAP FIND LATEST LIVE");
  }
}

els.joinBtn?.addEventListener("click", joinLive);
els.latestBtn?.addEventListener("click", findLatestLive);
els.unlockBtn?.addEventListener("click", unlockVip);
els.requestCohostBtn?.addEventListener("click", requestCohost);
els.sendChatBtn?.addEventListener("click", sendChat);

els.chatInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    sendChat();
  }
});

els.emojiButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    sendReaction(btn.dataset.emoji);
  });
});

window.addEventListener("beforeunload", async () => {
  if (room) room.disconnect();
  await endViewSession();
});

bootWatch();
