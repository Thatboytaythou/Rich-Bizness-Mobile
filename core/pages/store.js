import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================
   RICH BIZNESS MOBILE STORE
   /core/pages/store.js
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

  marketPanel: $("marketPanel"),
  sellPanel: $("sellPanel"),
  ordersPanel: $("ordersPanel"),
  payoutsPanel: $("payoutsPanel"),

  statProducts: $("statProducts"),
  statOrders: $("statOrders"),
  statBalance: $("statBalance"),
  statPayouts: $("statPayouts"),
  productCount: $("productCount"),

  searchInput: $("searchInput"),
  productsList: $("productsList"),

  titleInput: $("titleInput"),
  priceInput: $("priceInput"),
  categoryInput: $("categoryInput"),
  productTypeInput: $("productTypeInput"),
  imageInput: $("imageInput"),
  mediaInput: $("mediaInput"),
  locationInput: $("locationInput"),
  quantityInput: $("quantityInput"),
  descriptionInput: $("descriptionInput"),
  createProductBtn: $("createProductBtn"),
  storeStatus: $("storeStatus"),

  ordersList: $("ordersList"),

  availableBalance: $("availableBalance"),
  payoutAmountInput: $("payoutAmountInput"),
  requestPayoutBtn: $("requestPayoutBtn"),
  payoutsList: $("payoutsList")
};

let currentUser = null;
let currentProfile = null;

let products = [];
let orders = [];
let payouts = [];
let balance = null;

let realtimeChannel = null;

function setStatus(message) {
  if (els.storeStatus) els.storeStatus.textContent = message || "";
}

function money(cents = 0) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getUsername() {
  return (
    currentProfile?.username ||
    currentProfile?.display_name ||
    currentUser?.email?.split("@")[0] ||
    "seller"
  );
}

function getLocationParts(value = "") {
  const parts = String(value)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  return {
    location_label: value.trim() || null,
    city: parts[0] || null,
    state: parts[1] || null
  };
}

function updateStats() {
  const totalProducts = products.length;
  const totalOrders = orders.length;
  const available = balance?.available_cents || balance?.available_balance_cents || 0;

  els.statProducts.textContent = totalProducts.toLocaleString();
  els.statOrders.textContent = totalOrders.toLocaleString();
  els.statBalance.textContent = money(available);
  els.statPayouts.textContent = payouts.length.toLocaleString();

  els.productCount.textContent = totalProducts.toLocaleString();
  els.availableBalance.textContent = money(available);
}

/* =========================
   AUTH + PROFILE
========================= */
async function loadUser() {
  const { data } = await supabase.auth.getUser();
  currentUser = data?.user || null;

  if (!currentUser) {
    setStatus("SIGN IN REQUIRED TO SELL");
    return;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("id", currentUser.id)
    .maybeSingle();

  currentProfile = profile || null;

  await ensureSellerProfile();
  await ensureBalance();
}

async function ensureSellerProfile() {
  if (!currentUser) return;

  const { data: existing } = await supabase
    .from("store_seller_profiles")
    .select("*")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from("store_seller_profiles")
    .insert({
      user_id: currentUser.id,
      seller_name: getUsername(),
      status: "active"
    })
    .select("*")
    .single();

  if (error) {
    console.warn("Seller profile create error:", error);
    return null;
  }

  return data;
}

async function ensureBalance() {
  if (!currentUser) return;

  const { data: existing } = await supabase
    .from("creator_available_balances")
    .select("*")
    .eq("artist_user_id", currentUser.id)
    .maybeSingle();

  if (existing) {
    balance = existing;
    return existing;
  }

  const { data, error } = await supabase
    .from("creator_available_balances")
    .insert({
      artist_user_id: currentUser.id,
      earned_cents: 0,
      pending_cents: 0,
      paid_out_cents: 0,
      available_cents: 0,
      currency: "usd"
    })
    .select("*")
    .single();

  if (error) {
    console.warn("Balance create error:", error);
    return null;
  }

  balance = data;
  return data;
}

/* =========================
   TABS
========================= */
function switchTab(tab) {
  els.tabs.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });

  els.marketPanel.style.display = tab === "market" ? "block" : "none";
  els.sellPanel.style.display = tab === "sell" ? "block" : "none";
  els.ordersPanel.style.display = tab === "orders" ? "block" : "none";
  els.payoutsPanel.style.display = tab === "payouts" ? "block" : "none";
}

/* =========================
   PRODUCTS
========================= */
async function loadProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .in("status", ["active", "sold"])
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) {
    console.warn("Products load error:", error);
    els.productsList.innerHTML = `<div class="empty">Products could not load. Check products RLS.</div>`;
    return;
  }

  products = data || [];
  renderProducts();
  updateStats();
}

function filteredProducts() {
  const q = (els.searchInput.value || "").trim().toLowerCase();

  if (!q) return products;

  return products.filter((product) => {
    return [
      product.title,
      product.description,
      product.category,
      product.product_type,
      product.location_label,
      product.city,
      product.state
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q);
  });
}

function renderProducts() {
  const list = filteredProducts();

  if (!list.length) {
    els.productsList.innerHTML = `<div class="empty">No products yet. Drop the first Rich Bizness listing.</div>`;
    return;
  }

  els.productsList.innerHTML = list.map((product) => {
    const image = product.image_url || product.cover_url || "/images/rich-biz.jpeg";
    const location = product.location_label || [product.city, product.state].filter(Boolean).join(", ");
    const tag = [
      product.category || "marketplace",
      product.product_type || "physical",
      location || null
    ].filter(Boolean).join(" · ");

    return `
      <article class="product-card">
        <img class="product-img" src="${escapeHtml(image)}" alt="${escapeHtml(product.title)}" />

        <div class="product-info">
          <h3>${escapeHtml(product.title)}</h3>
          <div class="product-meta">${escapeHtml(tag)} · ${money(product.price_cents)}</div>
          <p>${escapeHtml(product.description || "Rich Bizness marketplace listing.")}</p>

          <div class="product-actions">
            <button class="small-btn" data-buy="${product.id}">BUY</button>
            <button class="small-btn" data-like="${product.id}">♡ LIKE</button>
            <button class="small-btn" data-view="${product.id}">VIEW</button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

async function createProduct() {
  if (!currentUser) {
    window.location.href = "/auth.html";
    return;
  }

  const title = els.titleInput.value.trim();
  const price = Number(els.priceInput.value || 0);

  if (!title) {
    setStatus("PRODUCT TITLE REQUIRED");
    return;
  }

  if (price < 0) {
    setStatus("PRICE INVALID");
    return;
  }

  const location = getLocationParts(els.locationInput.value);
  const productType = els.productTypeInput.value || "physical";

  setStatus("DROPPING PRODUCT...");

  const { data, error } = await supabase
    .from("products")
    .insert({
      seller_id: currentUser.id,
      title,
      description: els.descriptionInput.value.trim() || null,
      category: els.categoryInput.value || "marketplace",
      price_cents: price,
      currency: "usd",
      image_url: els.imageInput.value.trim() || null,
      cover_url: els.imageInput.value.trim() || null,
      media_url: els.mediaInput.value.trim() || null,
      product_type: productType,
      fulfillment_type: productType === "digital" ? "digital" : productType === "local" ? "local" : "shipping",
      quantity: Number(els.quantityInput.value || 1),
      is_digital: productType === "digital",
      is_local: productType === "local",
      status: "active",
      ...location
    })
    .select("*")
    .single();

  if (error) {
    setStatus(`PRODUCT ERROR: ${error.message}`);
    return;
  }

  products.unshift(data);
  renderProducts();
  updateStats();

  els.titleInput.value = "";
  els.descriptionInput.value = "";
  els.imageInput.value = "";
  els.mediaInput.value = "";
  els.locationInput.value = "";
  els.priceInput.value = 1000;
  els.quantityInput.value = 1;

  setStatus("PRODUCT LIVE IN MARKETPLACE");
  switchTab("market");
}

/* =========================
   PRODUCT ACTIONS
========================= */
async function viewProduct(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product) return;

  const anonymousId = localStorage.getItem("rb_store_guest_id") || crypto.randomUUID();
  localStorage.setItem("rb_store_guest_id", anonymousId);

  await supabase.from("product_views").insert({
    product_id: productId,
    user_id: currentUser?.id || null,
    anonymous_id: currentUser ? null : anonymousId
  });

  await supabase
    .from("products")
    .update({
      views: Number(product.views || 0) + 1
    })
    .eq("id", productId);

  alert(`${product.title}\n\n${money(product.price_cents)}\n\n${product.description || "Rich Bizness marketplace listing."}`);
}

async function likeProduct(productId) {
  if (!currentUser) {
    window.location.href = "/auth.html";
    return;
  }

  const product = products.find((item) => item.id === productId);
  if (!product) return;

  const { error } = await supabase
    .from("product_likes")
    .insert({
      product_id: productId,
      user_id: currentUser.id
    });

  if (error && !String(error.message || "").toLowerCase().includes("duplicate")) {
    setStatus(`LIKE ERROR: ${error.message}`);
    return;
  }

  await supabase
    .from("products")
    .update({
      likes: Number(product.likes || 0) + 1
    })
    .eq("id", productId);

  setStatus("PRODUCT LIKED");
}

async function buyProduct(productId) {
  if (!currentUser) {
    window.location.href = "/auth.html";
    return;
  }

  const product = products.find((item) => item.id === productId);
  if (!product) return;

  if (product.seller_id === currentUser.id) {
    setStatus("YOU OWN THIS PRODUCT");
    return;
  }

  const amount = Number(product.price_cents || 0);
  const platformFee = Math.round(amount * 0.1);
  const sellerAmount = Math.max(amount - platformFee, 0);

  const { data, error } = await supabase
    .from("store_orders")
    .insert({
      buyer_id: currentUser.id,
      seller_id: product.seller_id,
      product_id: product.id,
      product_name: product.title,
      quantity: 1,
      amount_total: amount,
      platform_fee_cents: platformFee,
      seller_amount_cents: sellerAmount,
      currency: product.currency || "usd",
      payment_status: amount > 0 ? "pending" : "paid",
      order_status: "pending",
      customer_email: currentUser.email || null,
      fulfillment_type: product.fulfillment_type || "shipping",
      metadata: {
        source: "store.html",
        note: "Stripe checkout connects next"
      }
    })
    .select("*")
    .single();

  if (error) {
    setStatus(`ORDER ERROR: ${error.message}`);
    return;
  }

  if (product.is_digital || amount <= 0) {
    await supabase
      .from("user_product_unlocks")
      .upsert({
        user_id: currentUser.id,
        product_id: product.id,
        order_id: data.id,
        metadata: {
          media_url: product.media_url || null
        }
      }, {
        onConflict: "user_id,product_id"
      });
  }

  orders.unshift(data);
  renderOrders();
  updateStats();

  setStatus(amount > 0 ? "ORDER CREATED — STRIPE CHECKOUT NEXT" : "PRODUCT UNLOCKED");
  switchTab("orders");
}

/* =========================
   ORDERS
========================= */
async function loadOrders() {
  if (!currentUser) {
    orders = [];
    renderOrders();
    return;
  }

  const { data, error } = await supabase
    .from("store_orders")
    .select("*")
    .or(`buyer_id.eq.${currentUser.id},seller_id.eq.${currentUser.id}`)
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) {
    console.warn("Orders load error:", error);
    els.ordersList.innerHTML = `<div class="empty">Orders could not load. Check store_orders RLS.</div>`;
    return;
  }

  orders = data || [];
  renderOrders();
  updateStats();
}

function renderOrders() {
  if (!orders.length) {
    els.ordersList.innerHTML = `<div class="empty">No orders yet. Orders appear here after checkout.</div>`;
    return;
  }

  els.ordersList.innerHTML = orders.map((order) => `
    <article class="product-card">
      <div class="product-img" style="display:grid;place-items:center;font-size:32px;">📦</div>

      <div class="product-info">
        <h3>${escapeHtml(order.product_name || "Store Order")}</h3>
        <div class="product-meta">${escapeHtml(order.payment_status || "pending")} · ${escapeHtml(order.order_status || "pending")} · ${money(order.amount_total)}</div>
        <p>Quantity ${Number(order.quantity || 1)} • ${escapeHtml(order.fulfillment_type || "shipping")}</p>

        <div class="product-actions">
          <button class="small-btn" data-order="${order.id}">DETAILS</button>
          <button class="small-btn" data-order-paid="${order.id}">MARK PAID</button>
          <button class="small-btn" data-order-shipped="${order.id}">SHIP</button>
        </div>
      </div>
    </article>
  `).join("");
}

async function markOrderPaid(orderId) {
  if (!currentUser) return;

  const order = orders.find((item) => item.id === orderId);
  if (!order) return;

  const { data, error } = await supabase
    .from("store_orders")
    .update({
      payment_status: "paid",
      order_status: order.order_status === "pending" ? "paid" : order.order_status,
      paid_at: new Date().toISOString()
    })
    .eq("id", orderId)
    .select("*")
    .single();

  if (error) {
    setStatus(`ORDER UPDATE ERROR: ${error.message}`);
    return;
  }

  if (order.seller_id) {
    await addSellerPendingBalance(order.seller_id, Number(order.seller_amount_cents || 0));
  }

  if (order.product_id) {
    await supabase
      .from("products")
      .update({
        sales_count: Number(products.find((p) => p.id === order.product_id)?.sales_count || 0) + 1
      })
      .eq("id", order.product_id);
  }

  orders = orders.map((item) => item.id === orderId ? data : item);
  renderOrders();
  setStatus("ORDER MARKED PAID");
}

async function markOrderShipped(orderId) {
  const { data, error } = await supabase
    .from("store_orders")
    .update({
      order_status: "shipped",
      shipped_at: new Date().toISOString()
    })
    .eq("id", orderId)
    .select("*")
    .single();

  if (error) {
    setStatus(`SHIP ERROR: ${error.message}`);
    return;
  }

  orders = orders.map((item) => item.id === orderId ? data : item);
  renderOrders();
  setStatus("ORDER SHIPPED");
}

async function addSellerPendingBalance(sellerId, amount) {
  if (!sellerId || amount <= 0) return;

  const { data: existing } = await supabase
    .from("creator_available_balances")
    .select("*")
    .eq("artist_user_id", sellerId)
    .maybeSingle();

  if (!existing) {
    await supabase
      .from("creator_available_balances")
      .insert({
        artist_user_id: sellerId,
        earned_cents: amount,
        pending_cents: amount,
        available_cents: 0,
        paid_out_cents: 0,
        currency: "usd"
      });

    return;
  }

  await supabase
    .from("creator_available_balances")
    .update({
      earned_cents: Number(existing.earned_cents || 0) + amount,
      pending_cents: Number(existing.pending_cents || 0) + amount
    })
    .eq("artist_user_id", sellerId);
}

/* =========================
   BALANCE + PAYOUTS
========================= */
async function loadBalance() {
  if (!currentUser) return;

  const { data } = await supabase
    .from("creator_available_balances")
    .select("*")
    .eq("artist_user_id", currentUser.id)
    .maybeSingle();

  balance = data || balance;
  updateStats();
}

async function loadPayouts() {
  if (!currentUser) {
    payouts = [];
    renderPayouts();
    return;
  }

  const { data, error } = await supabase
    .from("payout_requests")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.warn("Payouts load error:", error);
    return;
  }

  payouts = data || [];
  renderPayouts();
  updateStats();
}

function renderPayouts() {
  if (!payouts.length) {
    els.payoutsList.innerHTML = `<div class="empty">No payout requests yet.</div>`;
    return;
  }

  els.payoutsList.innerHTML = payouts.map((payout) => `
    <article class="product-card">
      <div class="product-img" style="display:grid;place-items:center;font-size:32px;">🏦</div>

      <div class="product-info">
        <h3>${money(payout.amount_cents)}</h3>
        <div class="product-meta">${escapeHtml(payout.status || "pending")} · ${escapeHtml(payout.currency || "usd")}</div>
        <p>Requested payout from Rich Bizness seller balance.</p>
      </div>
    </article>
  `).join("");
}

async function requestPayout() {
  if (!currentUser) {
    window.location.href = "/auth.html";
    return;
  }

  const amount = Number(els.payoutAmountInput.value || 0);

  if (amount < 100) {
    setStatus("PAYOUT MINIMUM IS $1.00");
    return;
  }

  const available = Number(balance?.available_cents || 0);

  if (available > 0 && amount > available) {
    setStatus("PAYOUT IS HIGHER THAN AVAILABLE BALANCE");
    return;
  }

  const { data, error } = await supabase
    .from("payout_requests")
    .insert({
      user_id: currentUser.id,
      amount_cents: amount,
      currency: "usd",
      status: "pending"
    })
    .select("*")
    .single();

  if (error) {
    setStatus(`PAYOUT ERROR: ${error.message}`);
    return;
  }

  payouts.unshift(data);
  renderPayouts();
  updateStats();
  setStatus("PAYOUT REQUEST SENT");
}

/* =========================
   REALTIME
========================= */
function startRealtime() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }

  realtimeChannel = supabase
    .channel("rich-bizness-store")
    .on("postgres_changes", { event: "*", schema: "public", table: "products" }, async () => {
      await loadProducts();
      setStatus("MARKET UPDATED LIVE");
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "store_orders" }, async () => {
      await loadOrders();
      setStatus("ORDERS UPDATED LIVE");
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "creator_available_balances" }, async () => {
      await loadBalance();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "payout_requests" }, async () => {
      await loadPayouts();
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setStatus("STORE REALTIME CONNECTED");
      }
    });
}

/* =========================
   EVENTS
========================= */
els.tabs.forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tab));
});

els.searchInput?.addEventListener("input", renderProducts);
els.createProductBtn?.addEventListener("click", createProduct);
els.requestPayoutBtn?.addEventListener("click", requestPayout);

document.addEventListener("click", async (event) => {
  const buy = event.target.closest("[data-buy]");
  const like = event.target.closest("[data-like]");
  const view = event.target.closest("[data-view]");
  const orderPaid = event.target.closest("[data-order-paid]");
  const orderShipped = event.target.closest("[data-order-shipped]");
  const orderDetails = event.target.closest("[data-order]");

  if (buy) {
    await buyProduct(buy.dataset.buy);
    return;
  }

  if (like) {
    await likeProduct(like.dataset.like);
    return;
  }

  if (view) {
    await viewProduct(view.dataset.view);
    return;
  }

  if (orderPaid) {
    await markOrderPaid(orderPaid.dataset.orderPaid);
    return;
  }

  if (orderShipped) {
    await markOrderShipped(orderShipped.dataset.orderShipped);
    return;
  }

  if (orderDetails) {
    const order = orders.find((item) => item.id === orderDetails.dataset.order);
    if (order) {
      alert(`${order.product_name}\n${money(order.amount_total)}\n${order.payment_status} / ${order.order_status}`);
    }
  }
});

/* =========================
   BOOT
========================= */
async function bootStore() {
  setStatus("BOOTING STORE...");

  await loadUser();
  await loadProducts();
  await loadOrders();
  await loadBalance();
  await loadPayouts();

  startRealtime();
  updateStats();

  setStatus("STORE MONEY ENGINE READY");
}

bootStore();
