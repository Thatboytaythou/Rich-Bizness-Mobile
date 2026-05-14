import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================
   RICH BIZNESS MOBILE MUSIC
   /core/pages/music.js
   Tracks + Upload Sync + Podcast + Radio Realtime
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
  tabs: document.querySelectorAll("[data-tab]"),

  nowCover: $("nowCover"),
  nowTitle: $("nowTitle"),
  nowMeta: $("nowMeta"),
  audioPlayer: $("audioPlayer"),

  dropType: $("dropType"),
  titleInput: $("titleInput"),
  descriptionInput: $("descriptionInput"),
  audioUrlInput: $("audioUrlInput"),
  coverUrlInput: $("coverUrlInput"),
  genreInput: $("genreInput"),
  episodeInput: $("episodeInput"),
  createDropBtn: $("createDropBtn"),

  musicStatus: $("musicStatus"),
  sectionTitle: $("sectionTitle"),
  sectionCount: $("sectionCount"),
  musicList: $("musicList")
};

let currentUser = null;
let currentProfile = null;

let activeTab = "tracks";
let tracks = [];
let musicUploads = [];
let podcasts = [];
let radioStations = [];
let likedTrackIds = new Set();

let realtimeChannel = null;

function setStatus(message) {
  if (els.musicStatus) els.musicStatus.textContent = message || "";
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getProfileName(profile, user) {
  return (
    profile?.display_name ||
    profile?.username ||
    user?.email?.split("@")[0] ||
    "Rich Creator"
  );
}

function getUsername(profile, user) {
  return (
    profile?.username ||
    user?.email?.split("@")[0] ||
    "creator"
  );
}

function coverHtml(url, fallback = "🎵") {
  if (!url) return escapeHtml(fallback);
  return `<img src="${escapeHtml(url)}" alt="" />`;
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

/* =========================
   AUTH + PROFILE
========================= */
async function loadUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) console.warn("Music auth error:", error);

  currentUser = data?.user || null;

  if (!currentUser) {
    if (els.createDropBtn) els.createDropBtn.disabled = true;
    setStatus("SIGN IN REQUIRED TO DROP MUSIC");
    return;
  }

  if (els.createDropBtn) els.createDropBtn.disabled = false;
  await loadProfile();
}

async function loadProfile() {
  if (!currentUser) return;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, created_at")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) console.warn("Music profile load error:", error);

  currentProfile = data || null;
}

/* =========================
   LOAD DATA
========================= */
async function loadLikedTracks() {
  likedTrackIds = new Set();

  if (!currentUser) return;

  const { data, error } = await supabase
    .from("music_likes")
    .select("track_id")
    .eq("user_id", currentUser.id);

  if (error) {
    console.warn("Music likes load error:", error);
    return;
  }

  likedTrackIds = new Set((data || []).map((row) => row.track_id));
}

async function loadTracks() {
  const { data, error } = await supabase
    .from("music_tracks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Tracks load error:", error);
    setStatus(`TRACKS ERROR: ${error.message}`);
    return;
  }

  tracks = data || [];
}

async function loadMusicUploads() {
  const { data, error } = await supabase
    .from("uploads")
    .select("*")
    .eq("section", "music")
    .eq("media_type", "audio")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.warn("Music uploads load error:", error.message);
    return;
  }

  musicUploads = data || [];
}

async function loadPodcasts() {
  const { data, error } = await supabase
    .from("podcast_episodes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Podcast load error:", error);
    setStatus(`PODCAST ERROR: ${error.message}`);
    return;
  }

  podcasts = data || [];
}

async function loadRadioStations() {
  const { data, error } = await supabase
    .from("radio_stations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Radio load error:", error);
    setStatus(`RADIO ERROR: ${error.message}`);
    return;
  }

  radioStations = data || [];
}

async function loadAllMusic() {
  setStatus("LOADING REALTIME MUSIC...");

  await loadLikedTracks();
  await loadTracks();
  await loadMusicUploads();
  await loadPodcasts();
  await loadRadioStations();

  renderActiveTab();

  setStatus("MUSIC REALTIME CONNECTED");
}

/* =========================
   UPLOAD SYNC
========================= */
function getSyncedTracks() {
  const existingUploadIds = new Set(
    tracks
      .map((track) => track?.metadata?.upload_id)
      .filter(Boolean)
  );

  const uploadTracks = musicUploads
    .filter((upload) => !existingUploadIds.has(upload.id))
    .map((upload) => {
      const identity = upload?.metadata?.identity || {};

      return {
        id: `upload-${upload.id}`,
        upload_id: upload.id,
        user_id: upload.user_id,
        username: identity.username || "creator",
        display_name: identity.display_name || "Rich Creator",
        title: upload.title || "Untitled Track",
        description: upload.description || "",
        audio_url: upload.public_url,
        cover_url: identity.avatar_url || null,
        genre: upload.category || "music",
        like_count: 0,
        play_count: 0,
        is_featured: false,
        created_at: upload.created_at,
        from_uploads_table: true
      };
    });

  return [...tracks, ...uploadTracks].sort((a, b) => {
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });
}

/* =========================
   RENDER
========================= */
function setActiveTab(tab) {
  activeTab = tab;

  els.tabs.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.tab === tab);
  });

  if (tab === "tracks" && els.dropType) els.dropType.value = "track";
  if (tab === "podcasts" && els.dropType) els.dropType.value = "podcast";
  if (tab === "radio" && els.dropType) els.dropType.value = "radio";

  renderActiveTab();
}

function renderActiveTab() {
  if (activeTab === "tracks") return renderTracks();
  if (activeTab === "podcasts") return renderPodcasts();
  return renderRadio();
}

function renderTracks() {
  const syncedTracks = getSyncedTracks();

  els.sectionTitle.textContent = "TRACKS";
  els.sectionCount.textContent = `${syncedTracks.length} live`;

  if (!syncedTracks.length) {
    els.musicList.innerHTML = `
      <div class="empty">
        No tracks yet. Drop the first Rich Bizness track.
      </div>
    `;
    return;
  }

  els.musicList.innerHTML = syncedTracks.map((track) => {
    const liked = !track.from_uploads_table && likedTrackIds.has(track.id);

    return `
      <article class="music-card">
        <div class="music-row">
          <div class="cover">${coverHtml(track.cover_url, "🎵")}</div>

          <div class="music-info">
            <strong>${escapeHtml(track.title)}</strong>
            <small>
              @${escapeHtml(track.username || "creator")} ·
              ${escapeHtml(track.genre || "MUSIC")} ·
              ${track.from_uploads_table ? "UPLOAD SYNC · " : ""}
              ${formatDate(track.created_at)}
            </small>
            ${track.description ? `<p>${escapeHtml(track.description)}</p>` : ""}
          </div>

          <button
            class="play-btn"
            type="button"
            data-action="play-track"
            data-id="${escapeHtml(track.id)}"
          >
            ▶
          </button>
        </div>

        <div class="actions">
          <button
            class="action-btn ${liked ? "is-liked" : ""}"
            type="button"
            data-action="like-track"
            data-id="${escapeHtml(track.id)}"
            ${track.from_uploads_table ? "disabled" : ""}
          >
            ${liked ? "💚" : "♡"} ${track.like_count || 0}
          </button>

          <button
            class="action-btn"
            type="button"
            data-action="play-track"
            data-id="${escapeHtml(track.id)}"
          >
            ▶ ${track.play_count || 0}
          </button>

          <button
            class="action-btn"
            type="button"
            data-action="comment-track"
            data-id="${escapeHtml(track.id)}"
            ${track.from_uploads_table ? "disabled" : ""}
          >
            💬 COMMENT
          </button>
        </div>
      </article>
    `;
  }).join("");
}

function renderPodcasts() {
  els.sectionTitle.textContent = "PODCAST";
  els.sectionCount.textContent = `${podcasts.length} live`;

  if (!podcasts.length) {
    els.musicList.innerHTML = `<div class="empty">No podcast episodes yet. Drop the first Rich Bizness episode.</div>`;
    return;
  }

  els.musicList.innerHTML = podcasts.map((episode) => `
    <article class="music-card">
      <div class="music-row">
        <div class="cover">${coverHtml(episode.cover_url, "🎙️")}</div>
        <div class="music-info">
          <strong>${escapeHtml(episode.title)}</strong>
          <small>EP ${episode.episode_number || 1} · @${escapeHtml(episode.username || "creator")} · ${formatDate(episode.created_at)}</small>
          ${episode.description ? `<p>${escapeHtml(episode.description)}</p>` : ""}
        </div>
        <button class="play-btn" type="button" data-action="play-podcast" data-id="${escapeHtml(episode.id)}">▶</button>
      </div>
    </article>
  `).join("");
}

function renderRadio() {
  els.sectionTitle.textContent = "RADIO";
  els.sectionCount.textContent = `${radioStations.length} live`;

  if (!radioStations.length) {
    els.musicList.innerHTML = `<div class="empty">No radio stations yet. Create the first Rich Bizness station.</div>`;
    return;
  }

  els.musicList.innerHTML = radioStations.map((station) => `
    <article class="music-card">
      <div class="music-row">
        <div class="cover">${coverHtml(station.cover_url, "📡")}</div>
        <div class="music-info">
          <strong>${escapeHtml(station.station_name)}</strong>
          <small>${station.is_live ? "LIVE NOW" : "STATION"} · ${escapeHtml(station.station_tag || "RADIO")} · ${formatDate(station.created_at)}</small>
          <p>${station.stream_url ? "Stream ready." : "Add a stream URL to activate this station."}</p>
        </div>
        <button class="play-btn" type="button" data-action="play-radio" data-id="${escapeHtml(station.id)}">▶</button>
      </div>
    </article>
  `).join("");
}

/* =========================
   PLAYER
========================= */
async function playItem(type, id) {
  let item = null;

  if (type === "track") item = getSyncedTracks().find((row) => String(row.id) === String(id));
  if (type === "podcast") item = podcasts.find((row) => String(row.id) === String(id));
  if (type === "radio") item = radioStations.find((row) => String(row.id) === String(id));

  if (!item) return;

  const title = item.title || item.station_name || "Untitled";
  const audioUrl = item.audio_url || item.stream_url;
  const coverUrl = item.cover_url || "";

  if (!audioUrl) {
    setStatus("NO AUDIO / STREAM URL ON THIS DROP");
    return;
  }

  els.nowTitle.textContent = title;
  els.nowMeta.textContent =
    type === "radio"
      ? `${item.station_tag || "RADIO"} · ${item.is_live ? "LIVE" : "STATION"}`
      : `@${item.username || "creator"} · ${item.genre || "RICH BIZNESS"}`;

  els.nowCover.innerHTML = coverHtml(
    coverUrl,
    type === "podcast" ? "🎙️" : type === "radio" ? "📡" : "🎵"
  );

  els.audioPlayer.src = audioUrl;

  await els.audioPlayer.play().catch(() => {
    setStatus("TAP PLAY ON THE AUDIO BAR TO START");
  });

  if (type === "track" && !item.from_uploads_table) {
    const nextPlayCount = (item.play_count || 0) + 1;

    await supabase
      .from("music_tracks")
      .update({ play_count: nextPlayCount })
      .eq("id", id);
  }
}

/* =========================
   CREATE DROP
========================= */
async function createDrop() {
  if (!currentUser) {
    setStatus("SIGN IN FIRST TO DROP MUSIC");
    window.location.href = "/auth.html";
    return;
  }

  const type = els.dropType.value;
  const title = els.titleInput.value.trim();
  const description = els.descriptionInput.value.trim();
  const audioUrl = els.audioUrlInput.value.trim();
  const coverUrl = els.coverUrlInput.value.trim();
  const genre = els.genreInput.value.trim();
  const episodeNumber = Number(els.episodeInput.value || 1);

  if (!title) return setStatus("TITLE REQUIRED");
  if (!audioUrl) return setStatus("AUDIO / STREAM URL REQUIRED");

  els.createDropBtn.disabled = true;
  setStatus("CREATING DROP...");

  const username = getUsername(currentProfile, currentUser);
  const displayName = getProfileName(currentProfile, currentUser);

  if (type === "track") {
    const { error } = await supabase.from("music_tracks").insert({
      user_id: currentUser.id,
      username,
      display_name: displayName,
      title,
      description: description || null,
      audio_url: audioUrl,
      cover_url: coverUrl || null,
      genre: genre || "Music",
      like_count: 0,
      play_count: 0,
      is_featured: false
    });

    if (error) return handleCreateError(error);
  }

  if (type === "podcast") {
    const { error } = await supabase.from("podcast_episodes").insert({
      user_id: currentUser.id,
      username,
      display_name: displayName,
      title,
      description: description || null,
      audio_url: audioUrl,
      cover_url: coverUrl || null,
      episode_number: episodeNumber || 1
    });

    if (error) return handleCreateError(error);
  }

  if (type === "radio") {
    const { error } = await supabase.from("radio_stations").insert({
      user_id: currentUser.id,
      station_name: title,
      station_tag: genre || "Radio",
      stream_url: audioUrl,
      cover_url: coverUrl || null,
      is_live: true
    });

    if (error) return handleCreateError(error);
  }

  els.titleInput.value = "";
  els.descriptionInput.value = "";
  els.audioUrlInput.value = "";
  els.coverUrlInput.value = "";
  els.genreInput.value = "";
  els.episodeInput.value = "1";

  setStatus("DROP LIVE");
  els.createDropBtn.disabled = false;

  await loadAllMusic();
}

function handleCreateError(error) {
  console.error("Create music drop error:", error);
  setStatus(`DROP ERROR: ${error.message}`);
  els.createDropBtn.disabled = false;
}

/* =========================
   LIKES / COMMENTS
========================= */
async function toggleTrackLike(trackId) {
  if (String(trackId).startsWith("upload-")) {
    setStatus("UPLOAD SYNC TRACK NEEDS MUSIC_TRACKS RECORD FIRST");
    return;
  }

  if (!currentUser) {
    setStatus("SIGN IN TO LIKE TRACKS");
    window.location.href = "/auth.html";
    return;
  }

  const liked = likedTrackIds.has(trackId);

  if (liked) {
    likedTrackIds.delete(trackId);
    renderTracks();

    const { error } = await supabase
      .from("music_likes")
      .delete()
      .eq("track_id", trackId)
      .eq("user_id", currentUser.id);

    if (error) {
      setStatus(`UNLIKE ERROR: ${error.message}`);
      await loadAllMusic();
    }

    return;
  }

  likedTrackIds.add(trackId);
  renderTracks();

  const { error } = await supabase.from("music_likes").insert({
    track_id: trackId,
    user_id: currentUser.id
  });

  if (error) {
    likedTrackIds.delete(trackId);
    setStatus(`LIKE ERROR: ${error.message}`);
    renderTracks();
    return;
  }

  const track = tracks.find((row) => row.id === trackId);
  const nextLikeCount = (track?.like_count || 0) + 1;

  await supabase
    .from("music_tracks")
    .update({ like_count: nextLikeCount })
    .eq("id", trackId);
}

async function commentTrack(trackId) {
  if (String(trackId).startsWith("upload-")) {
    setStatus("UPLOAD SYNC TRACK NEEDS MUSIC_TRACKS RECORD FIRST");
    return;
  }

  if (!currentUser) {
    setStatus("SIGN IN TO COMMENT");
    window.location.href = "/auth.html";
    return;
  }

  const comment = prompt("Drop a music comment:");
  if (!comment || !comment.trim()) return;

  const { error } = await supabase.from("music_comments").insert({
    track_id: trackId,
    user_id: currentUser.id,
    username: getUsername(currentProfile, currentUser),
    comment: comment.trim()
  });

  if (error) return setStatus(`COMMENT ERROR: ${error.message}`);

  setStatus("COMMENT LIVE");
}

/* =========================
   REALTIME
========================= */
function startRealtime() {
  if (realtimeChannel) supabase.removeChannel(realtimeChannel);

  realtimeChannel = supabase
    .channel("rich-bizness-music-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "music_tracks" }, async () => {
      await loadTracks();
      renderActiveTab();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "uploads" }, async () => {
      await loadMusicUploads();
      renderActiveTab();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "podcast_episodes" }, async () => {
      await loadPodcasts();
      renderActiveTab();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "radio_stations" }, async () => {
      await loadRadioStations();
      renderActiveTab();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "music_likes" }, async () => {
      await loadLikedTracks();
      await loadTracks();
      renderActiveTab();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "music_comments" }, async () => {
      setStatus("MUSIC COMMENT UPDATED LIVE");
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") setStatus("MUSIC REALTIME CONNECTED");
    });
}

/* =========================
   EVENTS
========================= */
els.tabs.forEach((button) => {
  button.addEventListener("click", () => setActiveTab(button.dataset.tab));
});

els.dropType?.addEventListener("change", () => {
  const type = els.dropType.value;
  if (type === "track") setActiveTab("tracks");
  if (type === "podcast") setActiveTab("podcasts");
  if (type === "radio") setActiveTab("radio");
});

els.createDropBtn?.addEventListener("click", createDrop);

els.musicList?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;

  const action = button.dataset.action;
  const id = button.dataset.id;

  if (!id) return;

  if (action === "play-track") return playItem("track", id);
  if (action === "play-podcast") return playItem("podcast", id);
  if (action === "play-radio") return playItem("radio", id);
  if (action === "like-track") return toggleTrackLike(id);
  if (action === "comment-track") return commentTrack(id);
});

/* =========================
   BOOT
========================= */
async function bootMusic() {
  setStatus("BOOTING MUSIC...");
  await loadUser();
  await loadAllMusic();
  startRealtime();
}

bootMusic();
