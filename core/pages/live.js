import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================
   RICH BIZNESS MOBILE LIVE
   /core/pages/live.js
   TABLE-SAFE VERSION
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
  statStatus: $("statStatus"),
  statViewers: $("statViewers"),
  statChat: $("statChat"),
  statRevenue: $("statRevenue"),

  previewVideo: $("previewVideo"),
  videoEmpty: $("videoEmpty"),
  liveBadge: $("liveBadge"),
  roleBadge: $("roleBadge"),

  cameraBtn: $("cameraBtn"),
  goLiveBtn: $("goLiveBtn"),
  copyWatchBtn: $("copyWatchBtn"),
  endLiveBtn: $("endLiveBtn"),

  titleInput: $("titleInput"),
  descriptionInput: $("descriptionInput"),
  categoryInput: $("categoryInput"),
  accessInput: $("accessInput"),
  priceInput: $("priceInput"),
  coverInput: $("coverInput"),
  saveSetupBtn: $("saveSetupBtn"),

  chatBox: $("chatBox"),
  chatInput: $("chatInput"),
  sendChatBtn: $("sendChatBtn"),
  emojiButtons: document.querySelectorAll("[data-emoji]"),

  tipAmountInput: $("tipAmountInput"),
  tipMessageInput: $("tipMessageInput"),
  tipBtn: $("tipBtn"),
  vipBtn: $("vipBtn"),
  moneyStatus: $("moneyStatus"),

  membersList: $("membersList"),
  requestCohostBtn: $("requestCohostBtn"),

  liveStatus: $("liveStatus")
};

let currentUser = null;
let currentProfile = null;
let localStream = null;
let room = null;
let currentStream = null;
let currentMember = null;
let chatMessages = [];
let members = [];
let realtimeChannel = null;
let isCameraOn = false;
let isLive = false;

function setStatus(message) {
  if (els.liveStatus) els.liveStatus.textContent = message || "";
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

function cleanSlug(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 44) || `live-${Date.now()}`;
}

function cleanIdentity(value = "guest") {
  return String(value)
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 70) || "guest";
}

function getUsername() {
  return currentProfile?.username || currentUser?.email?.split("@")[0] || "guest";
}

function getDisplayName() {
  return currentProfile?.display_name || currentProfile?.username || currentUser?.email?.split("@")[0] || "Guest";
}

function getRoomName(stream = currentStream) {
  return stream?.livekit_room_name || stream?.slug || "richbiz-live";
}

function getWatchUrl(stream = currentStream) {
  const slug = stream?.slug || getRoomName(stream);
  return `${window.location.origin}/watch.html?slug=${encodeURIComponent(slug)}`;
}

function updateHud() {
  const status = currentStream?.status || (isLive ? "live" : "offline");

  els.statStatus.textContent = status.toUpperCase();
  els.statViewers.textContent = Number(currentStream?.viewer_count || members.length || 0).toLocaleString();
  els.statChat.textContent = Number(currentStream?.total_chat_messages || chatMessages.length || 0).toLocaleString();
  els.statRevenue.textContent = money(currentStream?.total_revenue_cents || 0);

  els.liveBadge.textContent = status === "live" ? "LIVE 🔴" : status.toUpperCase();
  els.roleBadge.textContent = currentMember?.role?.toUpperCase?.() || "HOST";

  els.videoEmpty.style.display = isCameraOn ? "none" : "flex";
  els.cameraBtn.textContent = isCameraOn ? "STOP CAMERA" : "START CAMERA";
  els.goLiveBtn.textContent = isLive ? "LIVE ACTIVE 🔥" : "WE LIT 🔥";
}

function lockButtons(locked) {
  [
    els.cameraBtn,
    els.goLiveBtn,
    els.saveSetupBtn,
    els.sendChatBtn,
    els.tipBtn,
    els.vipBtn,
    els.requestCohostBtn
  ].forEach((btn) => {
    if (btn) btn.disabled = locked;
  });
}

/* AUTH */
async function loadUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) console.warn("Live auth error:", error.message);

  currentUser = data?.user || null;

  if (!currentUser) {
    setStatus("SIGN IN REQUIRED FOR HOST LIVE");
    setTimeout(() => {
      window.location.href = "/auth.html";
    }, 800);
    return false;
  }

  await loadProfile();
  return true;
}

async function loadProfile() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) console.warn("Live profile error:", error.message);
  currentProfile = data || null;
}

/* STREAM */
async function loadMyActiveStream() {
  const { data, error } = await supabase
    .from("live_streams")
    .select("*")
    .or(`creator_id.eq.${currentUser.id},user_id.eq.${currentUser.id}`)
    .in("status", ["draft", "offline", "live"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("Live stream load error:", error.message);
    return null;
  }

  currentStream = data || null;
  if (currentStream) hydrateSetup(currentStream);

  return currentStream;
}

function hydrateSetup(stream) {
  els.titleInput.value = stream.title || "Rich Bizness Live";
  els.descriptionInput.value = stream.description || "";
  els.categoryInput.value = stream.category || "live";
  els.accessInput.value = stream.access_type || "free";
  els.priceInput.value = Number(stream.price_cents || 0);
  els.coverInput.value = stream.cover_url || "";
  isLive = stream.status === "live";
}

async function createOrUpdateStream(forceStatus = null) {
  const title = els.titleInput.value.trim() || "Rich Bizness Live";
  const accessType = els.accessInput.value || "free";
  const priceCents = Number(els.priceInput.value || 0);
  const status = forceStatus || currentStream?.status || "draft";

  const payload = {
    creator_id: currentUser.id,
    user_id: currentUser.id,
    username: getUsername(),
    display_name: getDisplayName(),
    title,
    description: els.descriptionInput.value.trim() || null,
    category: els.categoryInput.value || "live",
    status,
    access_type: accessType,
    price_cents: priceCents,
    currency: "usd",
    thumbnail_url: els.coverInput.value.trim() || null,
    cover_url: els.coverInput.value.trim() || null,
    is_chat_enabled: true,
    is_cohost_enabled: true,
    is_vip_enabled: accessType === "vip" || accessType === "paid",
    last_activity_at: new Date().toISOString(),
    metadata: {
      source: "live.html",
      app: "Rich Bizness Mobile"
    }
  };

  if (!currentStream?.id) {
    const roomName = cleanSlug(`rb-${currentUser.id.slice(0, 8)}-${Date.now()}`);
    const slug = cleanSlug(`${getUsername()}-${title}-${Date.now()}`);

    const { data, error } = await supabase
      .from("live_streams")
      .insert({
        ...payload,
        slug,
        livekit_room_name: roomName,
        viewer_count: 0,
        peak_viewers: 0,
        total_chat_messages: 0,
        total_reactions: 0,
        total_revenue_cents: 0,
        is_featured: false
      })
      .select("*")
      .single();

    if (error) {
      setStatus(`LIVE SETUP ERROR: ${error.message}`);
      return null;
    }

    currentStream = data;
    await upsertHostMember("host");
    hydrateSetup(currentStream);
    updateHud();
    return currentStream;
  }

  if (forceStatus === "live") {
    payload.started_at = currentStream.started_at || new Date().toISOString();
    payload.ended_at = null;
  }

  if (forceStatus === "offline") {
    payload.ended_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("live_streams")
    .update(payload)
    .eq("id", currentStream.id)
    .select("*")
    .single();

  if (error) {
    setStatus(`LIVE UPDATE ERROR: ${error.message}`);
    return null;
  }

  currentStream = data;
  hydrateSetup(currentStream);
  updateHud();
  return currentStream;
}

async function upsertHostMember(role = "host") {
  if (!currentUser || !currentStream) return null;

  const { data: existing } = await supabase
    .from("live_stream_members")
    .select("*")
    .eq("stream_id", currentStream.id)
    .eq("user_id", currentUser.id)
    .maybeSingle();

  const payload = {
    stream_id: currentStream.id,
    user_id: currentUser.id,
    role,
    status: "active"
  };

  if (existing?.id) {
    const { data, error } = await supabase
      .from("live_stream_members")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (!error) currentMember = data;
    return data || existing;
  }

  const { data, error } = await supabase
    .from("live_stream_members")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    console.warn("Host member error:", error.message);
    return null;
  }

  currentMember = data;
  return data;
}

/* CAMERA + LIVEKIT */
async function startCamera() {
  if (!LK) {
    setStatus("LIVEKIT CLIENT MISSING");
    return;
  }

  if (isCameraOn) {
    stopCamera();
    return;
  }

  try {
    setStatus("STARTING CAMERA...");

    localStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: true
    });

    els.previewVideo.srcObject = localStream;
    isCameraOn = true;
    updateHud();
    setStatus("CAMERA READY");
  } catch (error) {
    setStatus(`CAMERA ERROR: ${error.message}`);
  }
}

function stopCamera() {
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
  }

  localStream = null;
  els.previewVideo.srcObject = null;
  isCameraOn = false;
  updateHud();
  setStatus("CAMERA OFF");
}

async function getLiveKitToken(role = "host") {
  const stream = currentStream || await createOrUpdateStream("draft");
  if (!stream) throw new Error("Missing stream");

  const roomName = getRoomName(stream);
  const identity = cleanIdentity(getUsername());

  const response = await fetch(
    `/api/livekit-token?room=${encodeURIComponent(roomName)}&username=${encodeURIComponent(identity)}&role=${encodeURIComponent(role)}`
  );

  const data = await response.json();

  if (!response.ok || !data.token) {
    throw new Error(data.error || "Missing LiveKit token");
  }

  return data;
}

async function connectLiveKit() {
  if (!LK) throw new Error("LiveKit failed to load");

  if (!localStream) await startCamera();
  if (!localStream) throw new Error("Camera is not available");

  const tokenData = await getLiveKitToken("host");

  room = new LK.Room({
    adaptiveStream: true,
    dynacast: true
  });

  room.on(LK.RoomEvent.ParticipantConnected, () => setStatus("VIEWER JOINED LIVE"));
  room.on(LK.RoomEvent.ParticipantDisconnected, () => setStatus("VIEWER LEFT LIVE"));
  room.on(LK.RoomEvent.Disconnected, () => setStatus("LIVEKIT DISCONNECTED"));

  await room.connect(LIVEKIT_URL, tokenData.token);

  for (const track of localStream.getTracks()) {
    if (track.kind === "video") {
      await room.localParticipant.publishTrack(new LK.LocalVideoTrack(track), { name: "camera" });
    }

    if (track.kind === "audio") {
      await room.localParticipant.publishTrack(new LK.LocalAudioTrack(track), { name: "microphone" });
    }
  }
}

async function goLive() {
  if (isLive) {
    setStatus("LIVE ALREADY ACTIVE");
    return;
  }

  try {
    lockButtons(true);
    setStatus("OPENING PORTAL...");

    await createOrUpdateStream("draft");
    await connectLiveKit();
    await createOrUpdateStream("live");
    await upsertHostMember("host");

    isLive = true;
    updateHud();
    setStatus("WE LIT 🔥 LIVE IS ACTIVE");
  } catch (error) {
    setStatus(`LIVE FAILED: ${error.message}`);
  } finally {
    lockButtons(false);
  }
}

async function endLive() {
  try {
    lockButtons(true);
    setStatus("ENDING LIVE...");

    if (room) {
      room.disconnect();
      room = null;
    }

    if (currentStream?.id) {
      await createOrUpdateStream("offline");

      if (currentMember?.id) {
        await supabase
          .from("live_stream_members")
          .update({ status: "left" })
          .eq("id", currentMember.id);
      }
    }

    isLive = false;
    updateHud();
    setStatus("STREAM ENDED");
  } catch (error) {
    setStatus(`END ERROR: ${error.message}`);
  } finally {
    lockButtons(false);
  }
}

/* CHAT + REACTIONS */
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
    .limit(80);

  if (error) {
    console.warn("Chat load error:", error.message);
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
        <p>Chat ready. Go live and turn it up.</p>
      </div>
    `;
    return;
  }

  els.chatBox.innerHTML = chatMessages.map((message) => `
    <div class="chat-message">
      <strong>${escapeHtml(message.user_id === currentUser?.id ? getUsername() : "fan")}</strong>
      <p>${escapeHtml(message.message || "")}</p>
    </div>
  `).join("");

  els.chatBox.scrollTop = els.chatBox.scrollHeight;
}

async function sendChat() {
  if (!currentUser) {
    window.location.href = "/auth.html";
    return;
  }

  const message = els.chatInput.value.trim();
  if (!message) return;

  const stream = currentStream || await createOrUpdateStream("draft");
  if (!stream) return;

  const { error } = await supabase
    .from("live_chat_messages")
    .insert({
      stream_id: stream.id,
      user_id: currentUser.id,
      message
    });

  if (error) {
    setStatus(`CHAT ERROR: ${error.message}`);
    return;
  }

  els.chatInput.value = "";

  await supabase
    .from("live_streams")
    .update({
      total_chat_messages: Number(stream.total_chat_messages || 0) + 1,
      last_activity_at: new Date().toISOString()
    })
    .eq("id", stream.id);

  setStatus("CHAT SENT LIVE");
}

async function sendReaction(reaction) {
  const stream = currentStream || await createOrUpdateStream("draft");
  if (!stream) return;

  const { error } = await supabase
    .from("live_reactions")
    .insert({
      stream_id: stream.id,
      user_id: currentUser?.id || null,
      reaction
    });

  if (error) {
    setStatus(`REACTION ERROR: ${error.message}`);
    return;
  }

  await supabase
    .from("live_streams")
    .update({
      total_reactions: Number(stream.total_reactions || 0) + 1,
      last_activity_at: new Date().toISOString()
    })
    .eq("id", stream.id);

  flashEmoji(reaction);
  setStatus(`${reaction} SENT`);
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

/* MEMBERS + MONEY */
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
    console.warn("Members load error:", error.message);
    return;
  }

  members = data || [];
  renderMembers();
}

function renderMembers() {
  if (!members.length) {
    els.membersList.innerHTML = `
      <div class="member">
        <strong>${escapeHtml(getDisplayName())}</strong>
        <small>HOST</small>
      </div>
    `;
    return;
  }

  els.membersList.innerHTML = members.map((member) => `
    <div class="member">
      <strong>${member.user_id === currentUser?.id ? escapeHtml(getDisplayName()) : "Viewer"}</strong>
      <small>${escapeHtml(member.role || "viewer").toUpperCase()}</small>
    </div>
  `).join("");
}

async function requestCohost() {
  const stream = currentStream || await createOrUpdateStream("draft");
  if (!stream || !currentUser) return;

  const { error } = await supabase
    .from("live_stream_members")
    .insert({
      stream_id: stream.id,
      user_id: currentUser.id,
      role: "cohost_request",
      status: "pending"
    });

  if (error) {
    setStatus(`CO-HOST ERROR: ${error.message}`);
    return;
  }

  setStatus("CO-HOST REQUEST SENT");
}

async function sendTip() {
  if (!currentUser) {
    window.location.href = "/auth.html";
    return;
  }

  const stream = currentStream || await createOrUpdateStream("draft");
  if (!stream) return;

  const amount = Number(els.tipAmountInput.value || 0);

  if (amount < 100) {
    setMoneyStatus("TIP MINIMUM IS $1.00");
    return;
  }

  const { error } = await supabase
    .from("live_tips")
    .insert({
      stream_id: stream.id,
      from_user_id: currentUser.id,
      to_user_id: stream.creator_id || stream.user_id || currentUser.id,
      username: getUsername(),
      amount_cents: amount,
      currency: "usd",
      status: "pending",
      message: els.tipMessageInput.value.trim() || null
    });

  if (error) {
    setMoneyStatus(`TIP ERROR: ${error.message}`);
    return;
  }

  setMoneyStatus("TIP CREATED — STRIPE CHECKOUT NEXT");
}

async function unlockVip() {
  if (!currentUser) {
    window.location.href = "/auth.html";
    return;
  }

  const stream = currentStream || await createOrUpdateStream("draft");
  if (!stream) return;

  const price = Number(stream.price_cents || els.priceInput.value || 0);

  const { error } = await supabase
    .from("live_stream_purchases")
    .insert({
      stream_id: stream.id,
      user_id: currentUser.id,
      amount_cents: price,
      currency: "usd",
      status: price > 0 ? "pending" : "paid",
      purchased_at: price > 0 ? null : new Date().toISOString(),
      metadata: {
        source: "live.html",
        app: "Rich Bizness Mobile"
      }
    });

  if (error) {
    setMoneyStatus(`VIP ERROR: ${error.message}`);
    return;
  }

  setMoneyStatus(price > 0 ? "VIP CREATED — STRIPE CHECKOUT NEXT" : "VIP UNLOCKED");
}

/* REALTIME */
function startRealtime() {
  if (realtimeChannel) supabase.removeChannel(realtimeChannel);

  realtimeChannel = supabase
    .channel("rich-bizness-live-studio")
    .on("postgres_changes", { event: "*", schema: "public", table: "live_streams" }, async (payload) => {
      if (payload.new?.id !== currentStream?.id) return;
      currentStream = payload.new;
      hydrateSetup(currentStream);
      updateHud();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "live_chat_messages" }, async (payload) => {
      if (payload.new?.stream_id !== currentStream?.id) return;
      await loadChat();
      updateHud();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "live_reactions" }, async (payload) => {
      if (payload.new?.stream_id !== currentStream?.id) return;
      flashEmoji(payload.new.reaction || "🔥");
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "live_stream_members" }, async (payload) => {
      if (payload.new?.stream_id !== currentStream?.id) return;
      await loadMembers();
      updateHud();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "live_stream_purchases" }, async (payload) => {
      if (payload.new?.stream_id !== currentStream?.id) return;
      setMoneyStatus("VIP PURCHASE UPDATED LIVE");
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "live_tips" }, async (payload) => {
      if (payload.new?.stream_id !== currentStream?.id) return;
      setMoneyStatus("TIP UPDATED LIVE");
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") setStatus("LIVE REALTIME CONNECTED");
    });
}

/* EVENTS */
els.cameraBtn?.addEventListener("click", startCamera);
els.goLiveBtn?.addEventListener("click", goLive);
els.endLiveBtn?.addEventListener("click", endLive);

els.saveSetupBtn?.addEventListener("click", async () => {
  setStatus("SAVING LIVE SETUP...");
  await createOrUpdateStream(currentStream?.status || "draft");
  await loadChat();
  await loadMembers();
  startRealtime();
  setStatus("LIVE SETUP SAVED");
});

els.copyWatchBtn?.addEventListener("click", async () => {
  const stream = currentStream || await createOrUpdateStream("draft");
  if (!stream) return;

  const url = getWatchUrl(stream);

  try {
    await navigator.clipboard.writeText(url);
    setStatus("WATCH LINK COPIED");
  } catch {
    prompt("Copy watch link:", url);
  }
});

els.sendChatBtn?.addEventListener("click", sendChat);

els.chatInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    sendChat();
  }
});

els.emojiButtons.forEach((btn) => {
  btn.addEventListener("click", () => sendReaction(btn.dataset.emoji));
});

els.requestCohostBtn?.addEventListener("click", requestCohost);
els.tipBtn?.addEventListener("click", sendTip);
els.vipBtn?.addEventListener("click", unlockVip);

window.addEventListener("beforeunload", () => {
  if (room) room.disconnect();
  if (localStream) localStream.getTracks().forEach((track) => track.stop());
});

/* BOOT */
async function bootLive() {
  setStatus("BOOTING LIVE...");

  if (!LK) {
    setStatus("LIVEKIT CLIENT FAILED TO LOAD");
    return;
  }

  const ok = await loadUser();
  if (!ok) return;

  await loadMyActiveStream();

  if (!currentStream) {
    await createOrUpdateStream("draft");
  }

  await upsertHostMember("host");
  await loadChat();
  await loadMembers();

  startRealtime();
  updateHud();

  setStatus("LIVE STUDIO READY");
}

bootLive();
