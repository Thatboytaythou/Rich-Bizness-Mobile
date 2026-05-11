import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================
   RICH BIZNESS MOBILE NOTIFICATIONS
   /core/pages/notifications.js
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
  statTotal: $("statTotal"),
  statUnread: $("statUnread"),
  statType: $("statType"),
  statStatus: $("statStatus"),

  searchInput: $("searchInput"),
  filterInput: $("filterInput"),
  markAllReadBtn: $("markAllReadBtn"),
  createTestBtn: $("createTestBtn"),
  notificationsStatus: $("notificationsStatus"),
  notificationsList: $("notificationsList")
};

let currentUser = null;
let notifications = [];
let realtimeChannel = null;

function setStatus(message, mode = "ready") {
  if (els.notificationsStatus) els.notificationsStatus.textContent = message || "";
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

function formatTime(value) {
  if (!value) return "JUST NOW";

  const date = new Date(value);
  const diff = Date.now() - date.getTime();

  const minute = 60000;
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

function iconForType(type = "system") {
  const icons = {
    message: "✉️",
    like: "💚",
    comment: "💬",
    order: "🛒",
    payout: "💰",
    live: "🔴",
    sports: "🏆",
    upload: "⬆️",
    follow: "👥",
    system: "🔔",
    vip: "💎",
    tip: "💸",
    store: "🏪",
    music: "🎵",
    gaming: "🎮",
    gallery: "▣"
  };

  return icons[type] || "🔔";
}

function updateStats() {
  const unread = notifications.filter((item) => !item.is_read).length;

  els.statTotal.textContent = notifications.length.toLocaleString();
  els.statUnread.textContent = unread.toLocaleString();
  els.statType.textContent = (els.filterInput.value || "all").toUpperCase();
}

async function loadUser() {
  const { data } = await supabase.auth.getUser();
  currentUser = data?.user || null;

  if (!currentUser) {
    setStatus("SIGN IN REQUIRED FOR NOTIFICATIONS", "locked");
    setTimeout(() => {
      window.location.href = "/auth.html";
    }, 700);
    return false;
  }

  return true;
}

async function loadNotifications() {
  setStatus("LOADING ALERTS...", "loading");

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Notifications load error:", error);
    setStatus(`ALERT ERROR: ${error.message}`, "error");

    els.notificationsList.innerHTML = `
      <div class="empty">Notifications could not load. Check notifications RLS.</div>
    `;
    return;
  }

  notifications = data || [];
  renderNotifications();
  updateStats();

  setStatus(notifications.length ? "NOTIFICATIONS READY" : "NO ALERTS YET", "ready");
}

function filteredNotifications() {
  const search = (els.searchInput.value || "").trim().toLowerCase();
  const filter = els.filterInput.value || "all";

  return notifications.filter((notice) => {
    const haystack = [
      notice.type,
      notice.title,
      notice.body,
      notice.target_table,
      notice.target_url,
      notice.priority
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = !search || haystack.includes(search);

    let matchesFilter = true;

    if (filter === "unread") {
      matchesFilter = !notice.is_read;
    } else if (filter !== "all") {
      matchesFilter = notice.type === filter || notice.target_table === filter;
    }

    return matchesSearch && matchesFilter;
  });
}

function renderNotifications() {
  const list = filteredNotifications();

  if (!list.length) {
    els.notificationsList.innerHTML = `
      <div class="empty">No alerts match this filter yet.</div>
    `;
    return;
  }

  els.notificationsList.innerHTML = list.map((notice) => {
    const unreadClass = notice.is_read ? "" : "unread";
    const icon = iconForType(notice.type);

    return `
      <article class="notice ${unreadClass}" data-notification="${escapeHtml(notice.id)}">
        <div class="notice-icon">${icon}</div>

        <div>
          <h3>${escapeHtml(notice.title || "Rich Bizness Alert")}</h3>
          <p>${escapeHtml(notice.body || "New realtime notification.")}</p>

          <div class="meta">
            ${escapeHtml(notice.type || "system")} ·
            ${escapeHtml(notice.priority || "normal")} ·
            ${formatTime(notice.created_at)}
          </div>

          <div class="notice-actions">
            <button class="small-btn" data-read="${escapeHtml(notice.id)}" type="button">
              ${notice.is_read ? "READ" : "MARK READ"}
            </button>

            <button class="small-btn" data-open="${escapeHtml(notice.target_url || "")}" type="button">
              OPEN
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

async function markRead(notificationId) {
  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      updated_at: new Date().toISOString()
    })
    .eq("id", notificationId)
    .eq("user_id", currentUser.id);

  if (error) {
    setStatus(`READ ERROR: ${error.message}`, "error");
    return;
  }

  await loadNotifications();
  setStatus("ALERT MARKED READ", "live");
}

async function markAllRead() {
  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      updated_at: new Date().toISOString()
    })
    .eq("user_id", currentUser.id)
    .eq("is_read", false);

  if (error) {
    setStatus(`MARK ALL ERROR: ${error.message}`, "error");
    return;
  }

  await loadNotifications();
  setStatus("ALL ALERTS READ", "live");
}

async function createTestNotification() {
  const { error } = await supabase
    .from("notifications")
    .insert({
      user_id: currentUser.id,
      actor_id: currentUser.id,
      type: "system",
      title: "Rich Bizness test alert 🔔",
      body: "Notifications realtime engine is connected and alive.",
      target_table: "notifications",
      target_url: "/notifications.html",
      priority: "high",
      metadata: {
        source: "notifications.html",
        test: true
      }
    });

  if (error) {
    setStatus(`TEST ERROR: ${error.message}`, "error");
    return;
  }

  setStatus("TEST ALERT SENT", "live");
  await loadNotifications();
}

function openTarget(url) {
  if (!url) {
    setStatus("NO TARGET LINK FOR THIS ALERT", "missing");
    return;
  }

  window.location.href = url;
}

function startRealtime() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }

  realtimeChannel = supabase
    .channel("rich-bizness-notifications")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${currentUser.id}`
      },
      async () => {
        await loadNotifications();
        setStatus("ALERTS UPDATED LIVE", "live");
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setStatus("NOTIFICATIONS REALTIME CONNECTED", "ready");
      }
    });
}

/* =========================
   EVENTS
========================= */

els.searchInput?.addEventListener("input", () => {
  renderNotifications();
  updateStats();
});

els.filterInput?.addEventListener("change", () => {
  renderNotifications();
  updateStats();
});

els.markAllReadBtn?.addEventListener("click", markAllRead);
els.createTestBtn?.addEventListener("click", createTestNotification);

els.notificationsList?.addEventListener("click", async (event) => {
  const readBtn = event.target.closest("[data-read]");
  const openBtn = event.target.closest("[data-open]");

  if (readBtn) {
    await markRead(readBtn.dataset.read);
    return;
  }

  if (openBtn) {
    openTarget(openBtn.dataset.open);
  }
});

/* =========================
   BOOT
========================= */

async function bootNotifications() {
  setStatus("BOOTING NOTIFICATIONS...", "boot");

  const ok = await loadUser();
  if (!ok) return;

  await loadNotifications();
  startRealtime();
  updateStats();

  setStatus("NOTIFICATIONS READY", "ready");
}

bootNotifications();
