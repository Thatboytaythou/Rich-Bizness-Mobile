import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

function setStatus(message) {
  if (els.authStatus) els.authStatus.textContent = message || "";
}

function lockButtons(locked) {
  [els.signInBtn, els.signUpBtn, els.signOutBtn].forEach((btn) => {
    if (btn) btn.disabled = locked;
  });
}

function cleanEmail() {
  return els.email?.value?.trim().toLowerCase() || "";
}

function cleanPassword() {
  return els.password?.value || "";
}

function showSignedIn(user) {
  if (!els.signedPanel) return;

  if (user) {
    els.signedPanel.classList.add("is-visible");
    els.signedEmail.textContent = user.email || "Signed in";
  } else {
    els.signedPanel.classList.remove("is-visible");
    els.signedEmail.textContent = "";
  }
}

async function ensureProfile(user) {
  if (!user) return;

  const username =
    user.user_metadata?.username ||
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "creator";

  const displayName =
    user.user_metadata?.display_name ||
    username;

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("profiles")
      .update({
        username,
        display_name: displayName,
        online_status: "online",
        last_seen_at: new Date().toISOString()
      })
      .eq("id", user.id);

    return;
  }

  await supabase
    .from("profiles")
    .insert({
      id: user.id,
      username,
      display_name: displayName,
      rich_level: "GUEST",
      rank_title: "VISITOR",
      rich_points: 0,
      balance_cents: 0,
      online_status: "online",
      last_seen_at: new Date().toISOString()
    });
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

  await ensureProfile(data.user);

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
      },
      emailRedirectTo: `${window.location.origin}/auth.html`
    }
  });

  if (error) {
    setStatus(error.message);
    lockButtons(false);
    return;
  }

  if (data.user) await ensureProfile(data.user);

  if (data.session) {
    setStatus("ACCOUNT READY 💰");
    window.location.href = "/index.html";
    return;
  }

  setStatus("CHECK EMAIL TO CONFIRM ACCOUNT");
  lockButtons(false);
}

async function signOut() {
  lockButtons(true);
  setStatus("SIGNING OUT...");

  await supabase.auth.signOut();

  showSignedIn(null);
  setStatus("IM OUT ✌🏽");

  setTimeout(() => {
    window.location.href = "/auth.html";
  }, 450);
}

async function bootAuth() {
  setStatus("BOOTING AUTH...");

  const { data } = await supabase.auth.getSession();
  const user = data?.session?.user || null;

  showSignedIn(user);

  if (user) {
    await ensureProfile(user);
    setStatus("AUTH CONNECTED");
  } else {
    setStatus("READY TO TAP IN 💰");
  }

  lockButtons(false);
}

supabase.auth.onAuthStateChange(async (event, session) => {
  const user = session?.user || null;

  showSignedIn(user);

  if (event === "SIGNED_IN" && user) {
    await ensureProfile(user);
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
  if (event.key === "Enter") signIn();
});

bootAuth();
