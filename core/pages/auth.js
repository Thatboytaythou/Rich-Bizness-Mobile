import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================
   RICH BIZNESS MOBILE AUTH
   /core/pages/auth.js
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
  email: $("email"),
  password: $("password"),
  signInBtn: $("signInBtn"),
  signUpBtn: $("signUpBtn"),
  signOutBtn: $("signOutBtn"),
  signedPanel: $("signedPanel"),
  signedEmail: $("signedEmail"),
  authStatus: $("authStatus")
};

let currentSession = null;
let currentUser = null;

function setStatus(message) {
  if (els.authStatus) els.authStatus.textContent = message || "";
}

function cleanEmail() {
  return els.email.value.trim().toLowerCase();
}

function cleanPassword() {
  return els.password.value;
}

function lockButtons(isLocked) {
  els.signInBtn.disabled = isLocked;
  els.signUpBtn.disabled = isLocked;
  els.signOutBtn.disabled = isLocked;
}

function showSignedIn(user) {
  currentUser = user || null;

  if (user) {
    els.signedPanel.classList.add("is-visible");
    els.signedEmail.textContent = user.email || "Signed in";
    setStatus("AUTH REALTIME CONNECTED");
    return;
  }

  els.signedPanel.classList.remove("is-visible");
  els.signedEmail.textContent = "";
}

async function ensureProfile(user) {
  if (!user) return null;

  const emailName = user.email?.split("@")[0] || "creator";
  const username =
    user.user_metadata?.username ||
    user.user_metadata?.display_name ||
    emailName;

  const displayName =
    user.user_metadata?.display_name ||
    username;

  const { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("id, username, display_name, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (readError) {
    console.warn("Profile read error:", readError);
  }

  if (existing) return existing;

  const { data: created, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      username,
      display_name: displayName
    })
    .select("id, username, display_name, created_at")
    .single();

  if (insertError) {
    console.warn("Profile create error:", insertError);
    setStatus(`PROFILE SYNC WARNING: ${insertError.message}`);
    return null;
  }

  return created;
}

async function signIn() {
  const email = cleanEmail();
  const password = cleanPassword();

  if (!email || !password) {
    setStatus("EMAIL + PASSWORD REQUIRED");
    return;
  }

  lockButtons(true);
  setStatus("TAPPING IN...");

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    setStatus(error.message);
    lockButtons(false);
    return;
  }

  currentSession = data?.session || null;
  currentUser = data?.user || null;

  await ensureProfile(currentUser);

  setStatus("TAPPED IN 💰");
  window.location.href = "/index.html";
}

async function signUp() {
  const email = cleanEmail();
  const password = cleanPassword();

  if (!email || !password) {
    setStatus("EMAIL + PASSWORD REQUIRED");
    return;
  }

  if (password.length < 6) {
    setStatus("PASSWORD NEEDS AT LEAST 6 CHARACTERS");
    return;
  }

  lockButtons(true);
  setStatus("CREATING ACCOUNT...");

  const username = email.split("@")[0];

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        display_name: username
      }
    }
  });

  if (error) {
    setStatus(error.message);
    lockButtons(false);
    return;
  }

  currentSession = data?.session || null;
  currentUser = data?.user || null;

  if (currentUser) {
    await ensureProfile(currentUser);
  }

  setStatus("ACCOUNT CREATED — TAP IN 💰");

  if (currentSession) {
    window.location.href = "/index.html";
    return;
  }

  lockButtons(false);
}

async function signOut() {
  lockButtons(true);
  setStatus("SIGNING OUT...");

  const { error } = await supabase.auth.signOut();

  if (error) {
    setStatus(error.message);
    lockButtons(false);
    return;
  }

  currentSession = null;
  currentUser = null;

  showSignedIn(null);
  setStatus("IM OUT ✌🏽");

  setTimeout(() => {
    window.location.href = "/auth.html";
  }, 450);
}

async function bootAuth() {
  setStatus("BOOTING AUTH...");

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    setStatus(error.message);
    return;
  }

  currentSession = data?.session || null;
  currentUser = currentSession?.user || null;

  showSignedIn(currentUser);

  if (currentUser) {
    await ensureProfile(currentUser);
  }

  setStatus(currentUser ? "AUTH REALTIME CONNECTED" : "READY TO TAP IN 💰");
  lockButtons(false);
}

supabase.auth.onAuthStateChange(async (event, session) => {
  currentSession = session || null;
  currentUser = session?.user || null;

  showSignedIn(currentUser);

  if (event === "SIGNED_IN" && currentUser) {
    await ensureProfile(currentUser);
    setStatus("TAPPED IN 💰");
  }

  if (event === "SIGNED_OUT") {
    setStatus("IM OUT ✌🏽");
  }
});

els.signInBtn?.addEventListener("click", signIn);
els.signUpBtn?.addEventListener("click", signUp);
els.signOutBtn?.addEventListener("click", signOut);

document.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    signIn();
  }
});

bootAuth();
