// Inventory Manager — by BigHappySmiley
// Single-file React app (in-browser Babel transform, no bundler).
const { useState, useEffect, useRef, useContext, createContext, useMemo, useCallback } = React;

// ============================================================
// FIREBASE INIT
// ============================================================
// TODO: replace with your real Firebase project config
// (Firebase console → Project settings → General → Your apps → SDK setup and configuration)
const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME.firebaseapp.com",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME.appspot.com",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME",
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ============================================================
// CONSTANTS
// ============================================================
const DEFAULT_CATEGORIES = {
  Electronics: "#2563eb",
  Tools: "#d97706",
  Food: "#16a34a",
  Clothing: "#db2777",
  Office: "#0891b2",
  Other: "#6b7094",
};

const SHELF_TYPES = ["Standard", "Cold Storage", "Hazmat", "Bulk", "High-Value"];

const SHELF_COLOR_PRESETS = ["#7c3aed", "#2563eb", "#16a34a", "#d97706", "#dc2626", "#0891b2", "#db2777", "#6b7094"];

const SUPER_ADMIN_EMAIL = "hf@bighappysmiley.com";
const ADMIN_DOMAIN = "@bighappysmiley.com";

const TICKET_STATUSES = ["open", "in-progress", "resolved", "closed"];
const TICKET_STATUS_LABEL = { open: "Open", "in-progress": "In Progress", resolved: "Resolved", closed: "Closed" };
const TICKET_STATUS_BADGE = { open: "badge-info", "in-progress": "badge-muted", resolved: "badge-success", closed: "badge-danger" };

// ============================================================
// UTILITIES
// ============================================================
function fbErr(code) {
  const map = {
    "auth/email-already-in-use": "That email is already registered.",
    "auth/invalid-email": "That email address looks invalid.",
    "auth/weak-password": "Password is too weak — use at least 6 characters.",
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/too-many-requests": "Too many attempts — please wait a moment and try again.",
    "auth/requires-recent-login": "Please sign in again to confirm this change.",
    "auth/network-request-failed": "Network error — check your connection and try again.",
    "auth/operation-not-allowed": "This sign-in method isn't enabled.",
    "auth/internal-error": "Something went wrong. Please try again.",
  };
  return map[code] || ("Error: " + code);
}

function fmtDateLong(d) {
  return new Date(d).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function relTime(ms) {
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return min + "m ago";
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr + "h ago";
  const day = Math.floor(hr / 24);
  return day + "d ago";
}

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function composeLocation(unit, shelf, row) {
  return "Unit " + unit + " · Shelf " + shelf + " · Row " + row;
}

function compactLocation(item) {
  if (item.unit != null && item.shelf != null && item.row != null) {
    return "U" + item.unit + "·S" + item.shelf + "·R" + item.row;
  }
  return item.location || "—";
}

// ============================================================
// ICONS (lightweight inline SVG, no external icon library)
// ============================================================
const ICON_PATHS = {
  dashboard: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  add: "M12 5v14M5 12h14",
  list: "M4 6h16M4 12h16M4 18h16",
  map: "M9 20l-6-3V4l6 3 6-3 6 3v13l-6-3-6 3zm0-13v13m6-16v13",
  shelf: "M3 3h18v4H3V3zm0 7h18v4H3v-4zm0 7h18v4H3v-4z",
  support: "M12 2a9 9 0 00-9 9v5a3 3 0 003 3h1v-7H5v-1a7 7 0 1114 0v1h-2v7h1a3 3 0 003-3v-5a9 9 0 00-9-9z",
  shield: "M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z",
  settings: "M12 8a4 4 0 100 8 4 4 0 000-8zm8.94 4a7 7 0 00-.14-1.4l2.1-1.65-2-3.46-2.5 1a7 7 0 00-2.4-1.4L15.5 2h-4l-.5 2.6a7 7 0 00-2.4 1.4l-2.5-1-2 3.46 2.1 1.65a7 7 0 000 2.8L1.6 14.6l2 3.46 2.5-1a7 7 0 002.4 1.4L9 22h4l.5-2.6a7 7 0 002.4-1.4l2.5 1 2-3.46-2.1-1.65a7 7 0 00.14-1.4z",
  logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14l5-5-5-5m5 5H9",
  sun: "M12 17a5 5 0 100-10 5 5 0 000 10zM12 1v2m0 18v2M4.2 4.2l1.4 1.4m12.8 12.8l1.4 1.4M1 12h2m18 0h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  moon: "M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z",
  edit: "M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z",
  trash: "M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m-9 0v14a1 1 0 001 1h8a1 1 0 001-1V6",
  search: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3",
  chevDown: "M6 9l6 6 6-6",
  chevUp: "M6 15l6-6 6 6",
  check: "M20 6L9 17l-5-5",
  x: "M18 6L6 18M6 6l12 12",
  scan: "M3 7V4a1 1 0 011-1h3M3 17v3a1 1 0 001 1h3m10-16h3a1 1 0 011 1v3m-1 13h-3M7 12h10",
  building: "M3 21h18M5 21V7l7-4 7 4v14M9 9h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1",
};
function Icon({ name, size = 18, style }) {
  const d = ICON_PATHS[name];
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d={d} />
    </svg>
  );
}

// ============================================================
// TOAST SYSTEM
// ============================================================
const ToastCtx = createContext(null);
let toastSeq = 1;
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((p) => p.filter((t) => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const notify = useCallback((message, type = "info") => {
    const id = toastSeq++;
    setToasts((p) => [...p, { id, message, type }]);
    timers.current[id] = setTimeout(() => dismiss(id), 3500);
  }, [dismiss]);

  return (
    <ToastCtx.Provider value={{ notify }}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={"toast toast-" + t.type} onClick={() => dismiss(t.id)}>{t.message}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
function useToast() { return useContext(ToastCtx); }

// ============================================================
// THEME
// ============================================================
const ThemeCtx = createContext(null);
function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem("sy_dark");
    return stored === null ? true : stored === "true";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("sy_dark", String(dark));
  }, [dark]);

  return <ThemeCtx.Provider value={{ dark, toggle: () => setDark((d) => !d) }}>{children}</ThemeCtx.Provider>;
}
function useTheme() { return useContext(ThemeCtx); }

function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <button className="theme-toggle" onClick={toggle}>
      <span>{dark ? "Dark Mode" : "Light Mode"}</span>
      <Icon name={dark ? "moon" : "sun"} size={16} />
    </button>
  );
}

// ============================================================
// ADMIN BOOTSTRAP
// ============================================================
// Runs once per login after auth resolves. No in-app "make me admin" button
// exists; admin status is either auto-granted to BigHappySmiley company
// emails or manually granted later via the Admin Panel.
async function ensureAdminBootstrap(user) {
  const ref = db.collection("admins").doc(user.uid);
  const snap = await ref.get();
  if (snap.exists) return true;

  const email = (user.email || "").toLowerCase();
  const isCompanyAdmin = email === SUPER_ADMIN_EMAIL || email.endsWith(ADMIN_DOMAIN);
  if (isCompanyAdmin) {
    await ref.set({ email: user.email, grantedBy: "auto", grantedAt: Date.now() });
    return true;
  }
  return false;
}

async function isUsernameTaken(username, excludeUid) {
  try {
    const snap = await db.collection("users_meta").where("username", "==", username).get();
    return snap.docs.some((d) => d.id !== excludeUid);
  } catch (e) {
    console.warn("Username uniqueness check failed, allowing through:", e);
    return false;
  }
}

// ============================================================
// AUTH SCREEN
// ============================================================
function AuthScreen() {
  const [mode, setMode] = useState("login"); // login | register | forgot
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");

  const switchMode = (m) => {
    setMode(m);
    setError("");
    setSuccessMsg("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await auth.signInWithEmailAndPassword(email, password);
    } catch (err) {
      setError(fbErr(err.code));
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !username || !password || !confirmPassword) {
      setError("All fields are required.");
      return;
    }
    if (username.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError("Username may only contain letters, numbers, and underscores.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setBusy(true);
    try {
      const taken = await isUsernameTaken(username, null);
      if (taken) {
        setError("That username is already taken.");
        setBusy(false);
        return;
      }
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      await db.collection("users_meta").doc(cred.user.uid).set({
        email, username, createdAt: Date.now(),
      });
    } catch (err) {
      setError(fbErr(err.code));
    } finally {
      setBusy(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setBusy(true);
    try {
      await auth.sendPasswordResetEmail(email);
      setSuccessMsg("Reset link sent! Check your inbox (and spam folder).");
    } catch (err) {
      setError(fbErr(err.code));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo-row">
          <div className="logo-box"><Icon name="building" size={26} style={{ color: "#fff" }} /></div>
          <div className="name">Inventory Manager</div>
          <div className="sub">by BigHappySmiley</div>
        </div>

        <div className="card">
          {error && <div className="auth-banner-error">{error}</div>}
          {successMsg && <div className="auth-banner-success">{successMsg}</div>}

          {mode === "login" && (
            <form onSubmit={handleLogin}>
              <div className="field">
                <label>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
              </div>
              <div className="field">
                <label>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div style={{ textAlign: "right", marginBottom: 14 }}>
                <button type="button" className="auth-link" onClick={() => switchMode("forgot")}>Forgot password?</button>
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                {busy ? "Signing in…" : "Sign In"}
              </button>
              <div className="auth-switch">
                Don't have an account? <button type="button" className="auth-link" onClick={() => switchMode("register")}>Create one</button>
              </div>
            </form>
          )}

          {mode === "register" && (
            <form onSubmit={handleRegister}>
              <div className="field">
                <label>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="field">
                <label>Username</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
              </div>
              <div className="field">
                <label>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div className="field">
                <label>Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                {busy ? "Creating account…" : "Create Account"}
              </button>
              <div className="auth-switch">
                Already have an account? <button type="button" className="auth-link" onClick={() => switchMode("login")}>Sign in</button>
              </div>
            </form>
          )}

          {mode === "forgot" && (
            <form onSubmit={handleForgot}>
              <div className="field">
                <label>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                {busy ? "Sending…" : "Send Reset Link"}
              </button>
              <div className="auth-switch">
                <button type="button" className="auth-link" onClick={() => switchMode("login")}>← Back to Sign In</button>
              </div>
            </form>
          )}
        </div>

        <div style={{ marginTop: 18, display: "flex", justifyContent: "center" }}>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SIDEBAR
// ============================================================
const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "add", label: "Add Item", icon: "add" },
  { key: "all", label: "View All", icon: "list" },
  { key: "map", label: "Warehouse Map", icon: "map" },
  { key: "storage", label: "Storage Setup", icon: "shelf" },
  { key: "support", label: "Support", icon: "support", adminOnly: true },
  { key: "admin", label: "Admin Panel", icon: "shield", adminOnly: true },
  { key: "settings", label: "Settings", icon: "settings" },
];

function Sidebar({ view, setView, collapsed, setCollapsed, isAdmin, authUser, username, openTicketCount, onSignOut }) {
  const items = NAV_ITEMS.filter((n) => !n.adminOnly || isAdmin);
  const displayName = username || authUser.email;
  const initial = (authUser.email || "?").charAt(0).toUpperCase();

  return (
    <div className={"sidebar" + (collapsed ? " collapsed" : "")}>
      <div className="sidebar-logo-row" onClick={() => setCollapsed((c) => !c)}>
        <div className="logo-box"><Icon name="building" size={18} style={{ color: "#fff" }} /></div>
        {!collapsed && (
          <div className="sidebar-brand">
            <div className="name">Inventory Manager</div>
            <div className="sub">by BigHappySmiley</div>
          </div>
        )}
      </div>

      <div className="sidebar-nav">
        {items.map((n) => (
          <button
            key={n.key}
            className={"nav-item" + (view === n.key ? " active" : "")}
            onClick={() => setView(n.key)}
            title={collapsed ? n.label : undefined}
          >
            <span className="nav-icon"><Icon name={n.icon} size={17} /></span>
            {!collapsed && <span>{n.label}</span>}
            {n.key === "support" && openTicketCount > 0 && !collapsed && (
              <span className="nav-badge">{openTicketCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="sidebar-footer">
        {!collapsed ? (
          <ThemeToggle />
        ) : (
          <button className="icon-btn" onClick={() => setCollapsed(false)} style={{ alignSelf: "center" }}>
            <Icon name="settings" size={16} />
          </button>
        )}
        <div className="user-chip">
          <div className="avatar-circle">{initial}</div>
          {!collapsed && (
            <div className="user-chip-info">
              <div className="uname">{displayName}</div>
            </div>
          )}
          <button className="icon-btn" onClick={onSignOut} title="Sign out">
            <Icon name="logout" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// APP SHELL
// ============================================================
function App() {
  const { notify } = useToast();

  const [authUser, setAuthUser] = useState(undefined); // undefined=loading, null=signed out, object=signed in
  const [isAdmin, setIsAdmin] = useState(false);

  const [items, setItems] = useState([]);
  const [shelves, setShelves] = useState([]);
  const [itemsLoaded, setItemsLoaded] = useState(false);
  const [shelvesLoaded, setShelvesLoaded] = useState(false);

  const [settings, setSettings] = useState({ mapLayout: [] });
  const [usersMeta, setUsersMeta] = useState(null);
  const [supportTickets, setSupportTickets] = useState([]);

  const [view, setView] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Auth state + admin bootstrap
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setAuthUser(null);
        setIsAdmin(false);
        setItems([]);
        setShelves([]);
        setItemsLoaded(false);
        setShelvesLoaded(false);
        setSettings({ mapLayout: [] });
        setUsersMeta(null);
        setSupportTickets([]);
        setView("dashboard");
        return;
      }
      try {
        const admin = await ensureAdminBootstrap(user);
        setIsAdmin(admin);
      } catch (e) {
        console.warn("Admin bootstrap failed:", e);
        setIsAdmin(false);
      }
      setAuthUser(user);
    });
    return () => unsub();
  }, []);

  // Live subscriptions: items, shelves
  useEffect(() => {
    if (!authUser) return;
    const unsubItems = db.collection("users").doc(authUser.uid).collection("items")
      .onSnapshot((snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setItemsLoaded(true);
      }, (e) => { console.warn("items subscription error:", e); setItemsLoaded(true); });

    const unsubShelves = db.collection("users").doc(authUser.uid).collection("shelves")
      .onSnapshot((snap) => {
        setShelves(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setShelvesLoaded(true);
      }, (e) => { console.warn("shelves subscription error:", e); setShelvesLoaded(true); });

    return () => { unsubItems(); unsubShelves(); };
  }, [authUser]);

  // One-time fetches: meta/settings, users_meta
  useEffect(() => {
    if (!authUser) return;
    db.collection("users").doc(authUser.uid).collection("meta").doc("settings").get()
      .then((snap) => { if (snap.exists) setSettings({ mapLayout: [], ...snap.data() }); })
      .catch((e) => console.warn("settings fetch failed:", e));

    db.collection("users_meta").doc(authUser.uid).get()
      .then((snap) => { if (snap.exists) setUsersMeta(snap.data()); })
      .catch((e) => console.warn("users_meta fetch failed:", e));
  }, [authUser]);

  // Admin-only: live support ticket subscription (for nav badge + Support view)
  useEffect(() => {
    if (!authUser || !isAdmin) { setSupportTickets([]); return; }
    const unsub = db.collection("support_tickets").onSnapshot((snap) => {
      setSupportTickets(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (e) => console.warn("support_tickets subscription error:", e));
    return () => unsub();
  }, [authUser, isAdmin]);

  // Defense in depth: redirect non-admins away from admin-only views
  useEffect(() => {
    if ((view === "support" || view === "admin") && !isAdmin) {
      setView("dashboard");
    }
  }, [view, isAdmin]);

  const refreshUsersMeta = useCallback(async () => {
    if (!authUser) return;
    const snap = await db.collection("users_meta").doc(authUser.uid).get();
    if (snap.exists) setUsersMeta(snap.data());
  }, [authUser]);

  const handleSignOut = async () => {
    await auth.signOut();
  };

  if (authUser === undefined) {
    return (
      <div className="full-spinner"><div className="spinner" /></div>
    );
  }

  if (authUser === null) {
    return <AuthScreen />;
  }

  if (!itemsLoaded || !shelvesLoaded) {
    return (
      <div className="full-spinner"><div className="spinner" /></div>
    );
  }

  const categories = (usersMeta && usersMeta.categories) || DEFAULT_CATEGORIES;
  const customFields = (usersMeta && usersMeta.customFields) || [];
  const warehouseConfig = (usersMeta && usersMeta.warehouseConfig) || { units: 1, shelves: 1, rows: 1 };
  const username = usersMeta && usersMeta.username;
  const openTicketCount = supportTickets.filter((t) => t.status === "open").length;

  const sharedProps = {
    authUser, isAdmin, items, shelves, settings, setSettings,
    usersMeta, refreshUsersMeta, categories, customFields, warehouseConfig,
    username, notify, setView, supportTickets,
  };

  let content = null;
  if (view === "dashboard") content = <Dashboard {...sharedProps} />;
  else if (view === "add") content = <AddItem {...sharedProps} />;
  else if (view === "all") content = <ViewAll {...sharedProps} />;
  else if (view === "map") content = <WarehouseMap {...sharedProps} />;
  else if (view === "storage") content = <StorageSetup {...sharedProps} />;
  else if (view === "support" && isAdmin) content = <Support {...sharedProps} />;
  else if (view === "admin" && isAdmin) content = <AdminPanel {...sharedProps} />;
  else if (view === "settings") content = <Settings {...sharedProps} />;

  return (
    <div className="app-shell">
      <Sidebar
        view={view} setView={setView}
        collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed}
        isAdmin={isAdmin} authUser={authUser} username={username}
        openTicketCount={openTicketCount} onSignOut={handleSignOut}
      />
      <div className="main-area">{content}</div>
    </div>
  );
}

// ============================================================
// VIEW STUBS (filled in by subsequent tasks)
// ============================================================
function Dashboard({ authUser, items, shelves, categories, setView }) {
  const totalUnits = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  const uniqueSkus = items.length;
  const shelfCount = shelves.length;
  const lowStockCount = items.filter((it) => (it.minStock || 0) > 0 && (Number(it.quantity) || 0) <= it.minStock).length;

  const recent = [...items].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0)).slice(0, 5);

  const catCounts = {};
  items.forEach((it) => {
    const c = it.category || "Other";
    catCounts[c] = (catCounts[c] || 0) + 1;
  });
  const maxCatCount = Math.max(1, ...Object.values(catCounts));

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-sub">{authUser.email} · {fmtDateLong(Date.now())}</p>

      <div className="stat-grid">
        <div className="card stat-card">
          <div className="stat-label">Total Units</div>
          <div className="stat-value">{totalUnits}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Unique SKUs</div>
          <div className="stat-value">{uniqueSkus}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Shelf Units</div>
          <div className="stat-value">{shelfCount}</div>
        </div>
        <div className={"card stat-card" + (lowStockCount > 0 ? " danger" : "")}>
          <div className="stat-label">Low Stock</div>
          <div className="stat-value">{lowStockCount}</div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="card">
          <h3 className="panel-title">Recent Additions</h3>
          {recent.length === 0 ? (
            <div className="empty-state">No items yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recent.map((it) => (
                <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="dot" style={{ background: categories[it.category] || "#6b7094" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{it.name}</div>
                    <div style={{ fontSize: "0.76rem", color: "var(--muted)" }}>
                      {it.sku || "—"} · {compactLocation(it)}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700 }}>{it.quantity}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="panel-title">By Category</h3>
          {Object.keys(catCounts).length === 0 ? (
            <div className="empty-state">No items yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {Object.entries(catCounts).map(([cat, count]) => (
                <div key={cat}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: 4 }}>
                    <span>{cat}</span>
                    <span style={{ color: "var(--muted)" }}>{count}</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: (count / maxCatCount * 100) + "%", background: categories[cat] || "#6b7094" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setView("add")}>
              <Icon name="add" size={14} /> Add Item
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setView("all")}>
              <Icon name="list" size={14} /> View All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
// ============================================================
// BARCODE SCANNER PANEL
// ============================================================
function BarcodeScannerPanel({ setField }) {
  const [scanning, setScanning] = useState(false);
  const [bufDisplay, setBufDisplay] = useState("");
  const bufRef = useRef("");
  const timerRef = useRef(null);
  const { notify } = useToast();

  useEffect(() => {
    if (!scanning) return;

    const handler = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const code = bufRef.current.trim();
        if (code) {
          setField("sku", code);
          notify("Scanned: " + code, "info");
        }
        bufRef.current = "";
        setBufDisplay("");
        setScanning(false);
        return;
      }
      if (e.key.length === 1) {
        bufRef.current += e.key;
        setBufDisplay(bufRef.current);
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          bufRef.current = "";
          setBufDisplay("");
        }, 150);
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      clearTimeout(timerRef.current);
    };
  }, [scanning]);

  const toggleScanning = (e) => {
    if (!scanning) {
      bufRef.current = "";
      setBufDisplay("");
      e.currentTarget.blur();
    }
    setScanning((prev) => !prev);
  };

  return (
    <div className={"scanner-panel" + (scanning ? " scanner-panel-active" : "")}>
      <div className="scanner-header">
        <span className="scanner-title">{scanning ? "Awaiting scan…" : "Barcode Scanner"}</span>
        <button type="button" className={"scanner-btn" + (scanning ? " scanner-btn-cancel" : "")} onClick={toggleScanning}>
          {scanning ? "Cancel" : "Activate"}
        </button>
      </div>
      {scanning && (
        <div className="scanner-buffer">
          {bufDisplay}
          <span className="scanner-cursor" />
        </div>
      )}
      <p className="scanner-helper">
        {scanning ? "Scan now — input captured automatically." : "Click Activate, then scan to auto-fill SKU."}
      </p>
    </div>
  );
}

// ============================================================
// ADD ITEM
// ============================================================
const EMPTY_ITEM_FORM = {
  name: "", sku: "", category: "Other", quantity: 1, minStock: 0, price: 0,
  company: "", unit: 1, shelf: 1, row: 1, notes: "",
};

function AddItem({ authUser, categories, customFields, warehouseConfig, notify }) {
  const [form, setForm] = useState(EMPTY_ITEM_FORM);
  const [customValues, setCustomValues] = useState({});
  const [busy, setBusy] = useState(false);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setCustomValue = (id, value) => setCustomValues((c) => ({ ...c, [id]: value }));

  const units = Array.from({ length: warehouseConfig.units || 1 }, (_, i) => i + 1);
  const shelfNums = Array.from({ length: warehouseConfig.shelves || 1 }, (_, i) => i + 1);
  const rows = Array.from({ length: warehouseConfig.rows || 1 }, (_, i) => i + 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      notify("Item name is required.", "error");
      return;
    }
    setBusy(true);
    try {
      const unit = Number(form.unit) || 1;
      const shelf = Number(form.shelf) || 1;
      const row = Number(form.row) || 1;
      await db.collection("users").doc(authUser.uid).collection("items").add({
        name: form.name.trim(),
        sku: form.sku.trim(),
        category: form.category || "Other",
        quantity: Number(form.quantity) || 0,
        minStock: Number(form.minStock) || 0,
        price: Number(form.price) || 0,
        company: form.company.trim(),
        unit, shelf, row,
        location: composeLocation(unit, shelf, row),
        notes: form.notes,
        customFields: customValues,
        addedAt: Date.now(),
      });
      notify("Item added.", "success");
      setForm(EMPTY_ITEM_FORM);
      setCustomValues({});
    } catch (err) {
      notify("Failed to add item: " + err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Add Item</h1>
      <p className="page-sub">Create a new inventory item.</p>

      <div className="card" style={{ maxWidth: 640 }}>
        <BarcodeScannerPanel setField={setField} />

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Item Name</label>
            <input type="text" value={form.name} onChange={(e) => setField("name", e.target.value)} required />
          </div>

          <div className="field-row">
            <div className="field">
              <label>SKU / Barcode</label>
              <input type="text" value={form.sku} onChange={(e) => setField("sku", e.target.value)} />
            </div>
            <div className="field">
              <label>Category</label>
              <select value={form.category} onChange={(e) => setField("category", e.target.value)}>
                {Object.keys(categories).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Quantity</label>
              <input type="number" value={form.quantity} onChange={(e) => setField("quantity", e.target.value)} />
            </div>
            <div className="field">
              <label>Min Stock Alert</label>
              <input type="number" value={form.minStock} onChange={(e) => setField("minStock", e.target.value)} />
            </div>
            <div className="field">
              <label>Unit Price ($)</label>
              <input type="number" step="0.01" value={form.price} onChange={(e) => setField("price", e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label>Company</label>
            <input type="text" value={form.company} onChange={(e) => setField("company", e.target.value)} />
          </div>

          <div className="field-row">
            <div className="field">
              <label>Unit</label>
              <select value={form.unit} onChange={(e) => setField("unit", e.target.value)}>
                {units.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Shelf</label>
              <select value={form.shelf} onChange={(e) => setField("shelf", e.target.value)}>
                {shelfNums.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Row</label>
              <select value={form.row} onChange={(e) => setField("row", e.target.value)}>
                {rows.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <p className="field-hint" style={{ marginTop: -8, marginBottom: 14 }}>
            📍 Unit {form.unit} · Shelf {form.shelf} · Row {form.row}
          </p>

          {customFields.length > 0 && (
            <>
              {customFields.map((f) => (
                <div className="field" key={f.id}>
                  <label>{f.label}</label>
                  <input
                    type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "url" ? "url" : "text"}
                    value={customValues[f.id] || ""}
                    onChange={(e) => setCustomValue(f.id, e.target.value)}
                  />
                </div>
              ))}
            </>
          )}

          <div className="field">
            <label>Notes</label>
            <textarea rows={3} value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
          </div>

          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Adding…" : "Add Item"}
          </button>
        </form>
      </div>
    </div>
  );
}
function isLowStock(item) {
  return (item.minStock || 0) > 0 && (Number(item.quantity) || 0) <= item.minStock;
}

const BULK_ACTIONS = [
  { key: "category", label: "Set Category" },
  { key: "location", label: "Set Location" },
  { key: "quantity", label: "Set Quantity" },
  { key: "minStock", label: "Set Min Stock" },
  { key: "price", label: "Set Price ($)" },
  { key: "company", label: "Set Company" },
  { key: "delete", label: "Delete Selected" },
];

function ViewAll({ authUser, items, shelves, categories, customFields, notify }) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [expandedNotes, setExpandedNotes] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [bulkAction, setBulkAction] = useState("category");
  const [bulkValue, setBulkValue] = useState("");
  const [bulkProgress, setBulkProgress] = useState(null);

  const filtered = items.filter((it) => {
    if (categoryFilter !== "All" && it.category !== categoryFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const hay = ((it.name || "") + " " + (it.sku || "") + " " + (it.location || "")).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const filteredIds = filtered.map((it) => it.id);
  const allIds = items.map((it) => it.id);
  const selectedSet = new Set(selectedIds);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedSet.has(id));
  const allItemsSelected = allIds.length > 0 && allIds.every((id) => selectedSet.has(id));
  const someSelected = selectedIds.length > 0;

  const toggleSelect = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const headerCheckboxClick = () => {
    if (!allFilteredSelected) {
      setSelectedIds(filteredIds);
    } else if (!allItemsSelected) {
      setSelectedIds(allIds);
    } else {
      setSelectedIds([]);
    }
  };

  const toggleNotes = (id) => {
    setExpandedNotes((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({ name: item.name || "", sku: item.sku || "", category: item.category || "Other", quantity: item.quantity || 0, location: item.location || "" });
  };

  const cancelEdit = () => { setEditingId(null); setEditForm(null); };

  const saveEdit = async (id) => {
    try {
      await db.collection("users").doc(authUser.uid).collection("items").doc(id).update({
        name: editForm.name.trim(),
        sku: editForm.sku.trim(),
        category: editForm.category,
        quantity: Number(editForm.quantity) || 0,
        location: editForm.location,
      });
      notify("Item updated.", "success");
      cancelEdit();
    } catch (err) {
      notify("Failed to update item: " + err.message, "error");
    }
  };

  const deleteItem = async (id) => {
    if (!confirm("Delete this item? This cannot be undone.")) return;
    try {
      await db.collection("users").doc(authUser.uid).collection("items").doc(id).delete();
      notify("Item deleted.", "success");
    } catch (err) {
      notify("Failed to delete item: " + err.message, "error");
    }
  };

  const applyBulkAction = async () => {
    if (selectedIds.length === 0) return;
    if (bulkAction === "delete") {
      if (!confirm("Delete " + selectedIds.length + " selected item(s)? This cannot be undone.")) return;
    }
    const coll = db.collection("users").doc(authUser.uid).collection("items");
    let done = 0;
    setBulkProgress(0);
    try {
      for (const id of selectedIds) {
        if (bulkAction === "delete") {
          await coll.doc(id).delete();
        } else if (bulkAction === "category") {
          await coll.doc(id).update({ category: bulkValue || "Other" });
        } else if (bulkAction === "location") {
          await coll.doc(id).update({ location: bulkValue });
        } else if (bulkAction === "quantity") {
          await coll.doc(id).update({ quantity: Number(bulkValue) || 0 });
        } else if (bulkAction === "minStock") {
          await coll.doc(id).update({ minStock: Number(bulkValue) || 0 });
        } else if (bulkAction === "price") {
          await coll.doc(id).update({ price: Number(bulkValue) || 0 });
        } else if (bulkAction === "company") {
          await coll.doc(id).update({ company: bulkValue });
        }
        done++;
        setBulkProgress(Math.round((done / selectedIds.length) * 100));
      }
      notify((bulkAction === "delete" ? "Deleted " : "Updated ") + done + " item(s).", "success");
      setSelectedIds([]);
    } catch (err) {
      notify("Bulk action failed: " + err.message, "error");
    } finally {
      setBulkProgress(null);
    }
  };

  return (
    <div>
      <h1 className="page-title">View All</h1>
      <p className="page-sub">{items.length} item(s) in inventory.</p>

      <div className="toolbar">
        <input type="search" placeholder="Search name, SKU, location…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="All">All Categories</option>
          {Object.keys(categories).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button
          className={"btn btn-sm " + (bulkMode ? "btn-primary" : "btn-secondary")}
          onClick={() => { setBulkMode((m) => !m); setSelectedIds([]); cancelEdit(); }}
        >
          Bulk Edit
        </button>
      </div>

      {bulkMode && someSelected && (
        <div className="card" style={{ marginBottom: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <strong>{selectedIds.length} selected</strong>
          <select value={bulkAction} onChange={(e) => { setBulkAction(e.target.value); setBulkValue(""); }}>
            {BULK_ACTIONS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
          </select>
          {bulkAction === "category" && (
            <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)}>
              <option value="">Select…</option>
              {Object.keys(categories).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          {bulkAction === "location" && (
            <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)}>
              <option value="">Select…</option>
              {shelves.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          )}
          {(bulkAction === "quantity" || bulkAction === "minStock" || bulkAction === "price") && (
            <input type="number" value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} style={{ width: 100 }} />
          )}
          {bulkAction === "company" && (
            <input type="text" value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} />
          )}
          <button className="btn btn-primary btn-sm" onClick={applyBulkAction} disabled={bulkProgress !== null}>Apply</button>
          {bulkProgress !== null && (
            <div className="progress-track" style={{ flex: 1, minWidth: 100 }}>
              <div className="progress-fill" style={{ width: bulkProgress + "%" }} />
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state">No items found.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              {bulkMode && (
                <th style={{ width: 30 }}>
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected && !allFilteredSelected; }}
                    onChange={headerCheckboxClick}
                  />
                </th>
              )}
              <th>Name</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Qty</th>
              <th>Location</th>
              {!bulkMode && <th></th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((it) => {
              const isEditing = editingId === it.id;
              const notesOpen = expandedNotes.includes(it.id);
              const populatedCustom = customFields.filter((f) => it.customFields && it.customFields[f.id]);

              if (isEditing) {
                return (
                  <tr key={it.id}>
                    <td colSpan={bulkMode ? 6 : 6}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Name" style={{ flex: 1 }} />
                        <input type="text" value={editForm.sku} onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })} placeholder="SKU" />
                        <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}>
                          {Object.keys(categories).map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input type="number" value={editForm.quantity} onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })} style={{ width: 80 }} />
                        <input type="text" value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} placeholder="Location" />
                        <button className="btn btn-success btn-sm" onClick={() => saveEdit(it.id)}>Save</button>
                        <button className="btn btn-secondary btn-sm" onClick={cancelEdit}>Cancel</button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <React.Fragment key={it.id}>
                  <tr
                    onClick={bulkMode ? () => toggleSelect(it.id) : undefined}
                    style={bulkMode ? { cursor: "pointer" } : undefined}
                  >
                    {bulkMode && (
                      <td onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedSet.has(it.id)} onChange={() => toggleSelect(it.id)} />
                      </td>
                    )}
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span className="dot" style={{ background: categories[it.category] || "#6b7094" }} />
                        <span style={{ fontWeight: 600 }}>{it.name}</span>
                        {!bulkMode && it.notes && (
                          <button className="icon-btn" onClick={() => toggleNotes(it.id)} title="Toggle notes">
                            <Icon name={notesOpen ? "chevUp" : "chevDown"} size={14} />
                          </button>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                        {isLowStock(it) && <span className="pill pill-low">LOW STOCK</span>}
                        {it.company && <span className="pill pill-company">🏢 {it.company}</span>}
                        {populatedCustom.map((f) => (
                          <span className="pill pill-custom" key={f.id}>{f.label}: {it.customFields[f.id]}</span>
                        ))}
                      </div>
                    </td>
                    <td>{it.sku || "—"}</td>
                    <td><span className="badge badge-info" style={{ background: (categories[it.category] || "#6b7094") + "26", color: categories[it.category] || "#6b7094" }}>{it.category || "Other"}</span></td>
                    <td style={isLowStock(it) ? { color: "var(--danger)", fontWeight: 700 } : undefined}>{it.quantity}</td>
                    <td>{compactLocation(it)}</td>
                    {!bulkMode && (
                      <td onClick={(e) => e.stopPropagation()}>
                        <button className="icon-btn" onClick={() => startEdit(it)}><Icon name="edit" size={15} /></button>
                        <button className="icon-btn" onClick={() => deleteItem(it.id)}><Icon name="trash" size={15} /></button>
                      </td>
                    )}
                  </tr>
                  {notesOpen && it.notes && (
                    <tr>
                      <td colSpan={bulkMode ? 6 : 6} style={{ whiteSpace: "pre-wrap", color: "var(--muted)", fontSize: "0.85rem" }}>
                        {it.notes}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      )}

      {bulkMode && (
        <div style={{ marginTop: 14, fontSize: "0.82rem", color: "var(--muted)", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <span>
            {selectedIds.length} selected
            {allItemsSelected && selectedIds.length > 0 ? " (all)" : allFilteredSelected && selectedIds.length > 0 ? " (all visible)" : ""}
          </span>
          <button className="auth-link" onClick={() => setSelectedIds(filteredIds)}>+ Select {filteredIds.length} visible</button>
          <button className="auth-link" onClick={() => setSelectedIds(allIds)}>+ Select all {allIds.length}</button>
          <button className="auth-link" onClick={() => setSelectedIds([])}>Clear</button>
        </div>
      )}
    </div>
  );
}
function WarehouseMap(props) { return <div className="empty-state">Warehouse Map — coming soon.</div>; }
const EMPTY_SHELF_FORM = { name: "", rows: 4, cols: 4, type: "Standard", color: SHELF_COLOR_PRESETS[0] };

function ShelfSlotGrid({ filled, total, color }) {
  const visible = Math.min(total, 32);
  const overflow = total - visible;
  const squares = [];
  for (let i = 0; i < visible; i++) {
    squares.push(
      <div key={i} style={{
        width: 12, height: 12, borderRadius: 2,
        background: i < filled ? color : "var(--border)",
      }} />
    );
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
      {squares}
      {overflow > 0 && <span style={{ fontSize: "0.65rem", color: "var(--muted)", marginLeft: 4 }}>+{overflow} more</span>}
    </div>
  );
}

function StorageSetup({ authUser, items, shelves, settings, setSettings, notify }) {
  const [form, setForm] = useState(EMPTY_SHELF_FORM);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const shelfColl = db.collection("users").doc(authUser.uid).collection("shelves");
  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      notify("Shelf name is required.", "error");
      return;
    }
    if (shelves.some((s) => s.name === form.name.trim())) {
      notify("A shelf with that name already exists.", "error");
      return;
    }
    setBusy(true);
    try {
      await shelfColl.add({
        name: form.name.trim(),
        rows: Number(form.rows) || 1,
        cols: Number(form.cols) || 1,
        type: form.type,
        color: form.color,
        createdAt: Date.now(),
      });
      notify("Shelf created.", "success");
      setForm(EMPTY_SHELF_FORM);
    } catch (err) {
      notify("Failed to create shelf: " + err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (shelf) => {
    setEditingId(shelf.id);
    setEditForm({ name: shelf.name, rows: shelf.rows, cols: shelf.cols, type: shelf.type, color: shelf.color });
  };
  const cancelEdit = () => { setEditingId(null); setEditForm(null); };

  const saveEdit = async (shelf) => {
    const newName = editForm.name.trim();
    if (!newName) { notify("Shelf name is required.", "error"); return; }
    if (newName !== shelf.name && shelves.some((s) => s.name === newName)) {
      notify("A shelf with that name already exists.", "error");
      return;
    }
    try {
      await shelfColl.doc(shelf.id).update({
        name: newName,
        rows: Number(editForm.rows) || 1,
        cols: Number(editForm.cols) || 1,
        type: editForm.type,
        color: editForm.color,
        updatedAt: Date.now(),
      });
      notify("Shelf updated.", "success");
      cancelEdit();
    } catch (err) {
      notify("Failed to update shelf: " + err.message, "error");
    }
  };

  const deleteShelf = async (shelf) => {
    if (!confirm('Delete shelf "' + shelf.name + '"? This cannot be undone.')) return;
    try {
      await shelfColl.doc(shelf.id).delete();
      const cleanedLayout = (settings.mapLayout || []).filter((m) => m.id !== shelf.id);
      if (cleanedLayout.length !== (settings.mapLayout || []).length) {
        await db.collection("users").doc(authUser.uid).collection("meta").doc("settings").set({ mapLayout: cleanedLayout }, { merge: true });
        setSettings((s) => ({ ...s, mapLayout: cleanedLayout }));
      }
      notify("Shelf deleted.", "success");
    } catch (err) {
      notify("Failed to delete shelf: " + err.message, "error");
    }
  };

  const itemCountForShelf = (shelf) => items.filter((it) => it.location === shelf.name).length;

  return (
    <div>
      <h1 className="page-title">Storage Setup</h1>
      <p className="page-sub">Manage your shelf and storage units.</p>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 18 }}>
        <div className="card">
          <h3 className="panel-title">New Shelf</h3>
          <form onSubmit={handleCreate}>
            <div className="field">
              <label>Shelf Name</label>
              <input type="text" value={form.name} onChange={(e) => setField("name", e.target.value)} required />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Rows</label>
                <input type="number" min="1" value={form.rows} onChange={(e) => setField("rows", e.target.value)} />
              </div>
              <div className="field">
                <label>Columns</label>
                <input type="number" min="1" value={form.cols} onChange={(e) => setField("cols", e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label>Type</label>
              <select value={form.type} onChange={(e) => setField("type", e.target.value)}>
                {SHELF_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Color</label>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                {SHELF_COLOR_PRESETS.map((c) => (
                  <button type="button" key={c} onClick={() => setField("color", c)}
                    style={{
                      width: 22, height: 22, borderRadius: "50%", background: c, cursor: "pointer",
                      border: form.color === c ? "2px solid var(--text)" : "2px solid transparent",
                    }} />
                ))}
                <input type="color" value={form.color} onChange={(e) => setField("color", e.target.value)} style={{ width: 30, height: 26, padding: 0, border: "none", background: "none" }} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? "Creating…" : "Create Shelf"}
            </button>
          </form>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {shelves.length === 0 ? (
            <div className="card"><div className="empty-state">No shelves yet — create one to get started.</div></div>
          ) : shelves.map((shelf) => {
            const total = (shelf.rows || 1) * (shelf.cols || 1);
            const filled = Math.min(itemCountForShelf(shelf), total);
            const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
            const isEditing = editingId === shelf.id;

            if (isEditing) {
              return (
                <div className="card" key={shelf.id}>
                  <div className="field-row">
                    <div className="field">
                      <label>Shelf Name</label>
                      <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                    </div>
                    <div className="field">
                      <label>Type</label>
                      <select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}>
                        {SHELF_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="field-row">
                    <div className="field">
                      <label>Rows</label>
                      <input type="number" min="1" value={editForm.rows} onChange={(e) => setEditForm({ ...editForm, rows: e.target.value })} />
                    </div>
                    <div className="field">
                      <label>Columns</label>
                      <input type="number" min="1" value={editForm.cols} onChange={(e) => setEditForm({ ...editForm, cols: e.target.value })} />
                    </div>
                  </div>
                  <div className="field">
                    <label>Color</label>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      {SHELF_COLOR_PRESETS.map((c) => (
                        <button type="button" key={c} onClick={() => setEditForm({ ...editForm, color: c })}
                          style={{
                            width: 22, height: 22, borderRadius: "50%", background: c, cursor: "pointer",
                            border: editForm.color === c ? "2px solid var(--text)" : "2px solid transparent",
                          }} />
                      ))}
                      <input type="color" value={editForm.color} onChange={(e) => setEditForm({ ...editForm, color: e.target.value })} style={{ width: 30, height: 26, padding: 0, border: "none", background: "none" }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-success btn-sm" onClick={() => saveEdit(shelf)}>Save</button>
                    <button className="btn btn-secondary btn-sm" onClick={cancelEdit}>Cancel</button>
                  </div>
                </div>
              );
            }

            return (
              <div className="card" key={shelf.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ margin: "0 0 2px" }}>{shelf.name}</h3>
                    <span className="badge badge-muted">{shelf.type}</span>
                  </div>
                  <div>
                    <button className="icon-btn" onClick={() => startEdit(shelf)}><Icon name="edit" size={15} /></button>
                    <button className="icon-btn" onClick={() => deleteShelf(shelf)}><Icon name="trash" size={15} /></button>
                  </div>
                </div>
                <div style={{ margin: "12px 0" }}>
                  <ShelfSlotGrid filled={filled} total={total} color={shelf.color} />
                </div>
                <div className="progress-track" style={{ marginBottom: 6 }}>
                  <div className="progress-fill" style={{ width: pct + "%", background: shelf.color }} />
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                  {shelf.rows}×{shelf.cols} · {pct}% full
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
const SETTINGS_TABS = [
  { key: "appearance", label: "Appearance" },
  { key: "account", label: "Account" },
  { key: "warehouse", label: "Warehouse Config" },
  { key: "categories", label: "Categories" },
  { key: "fields", label: "Custom Fields" },
  { key: "password", label: "Change Password" },
  { key: "data", label: "Data Management" },
];

const CUSTOM_FIELD_TYPES = ["text", "number", "date", "url"];

function normalizeImportItems(rawItems) {
  return (rawItems || []).map((raw) => {
    const it = { ...raw };
    delete it.id;
    if (it.barcode && !it.sku) { it.sku = it.barcode; }
    delete it.barcode;
    if (it.unit != null && it.shelf != null && it.row != null) {
      it.location = composeLocation(it.unit, it.shelf, it.row);
    }
    it.category = it.category || "Other";
    it.quantity = it.quantity != null ? Number(it.quantity) : 1;
    it.name = it.name || "Unnamed Item";
    return it;
  });
}

function Settings({ authUser, isAdmin, items, shelves, settings, setSettings, usersMeta, refreshUsersMeta, categories, customFields, warehouseConfig, username, notify }) {
  const [tab, setTab] = useState("appearance");

  // Change username
  const [newUsername, setNewUsername] = useState(username || "");
  const [usernameBusy, setUsernameBusy] = useState(false);

  // Warehouse config
  const [wcUnits, setWcUnits] = useState(warehouseConfig.units || 1);
  const [wcShelves, setWcShelves] = useState(warehouseConfig.shelves || 1);
  const [wcRows, setWcRows] = useState(warehouseConfig.rows || 1);
  const [wcBusy, setWcBusy] = useState(false);

  // Categories
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(SHELF_COLOR_PRESETS[0]);

  // Custom fields
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");

  // Password
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  // Data management
  const [importPreview, setImportPreview] = useState(null);
  const [importBusy, setImportBusy] = useState(false);
  const fileInputRef = useRef(null);

  const usersMetaRef = db.collection("users_meta").doc(authUser.uid);

  const handleChangeUsername = async () => {
    const u = newUsername.trim();
    if (u.length < 3) { notify("Username must be at least 3 characters.", "error"); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(u)) { notify("Username may only contain letters, numbers, and underscores.", "error"); return; }
    setUsernameBusy(true);
    try {
      const taken = await isUsernameTaken(u, authUser.uid);
      if (taken) { notify("That username is already taken.", "error"); return; }
      await usersMetaRef.set({ username: u }, { merge: true });
      window.__username = u;
      await refreshUsersMeta();
      notify("Username updated.", "success");
    } catch (err) {
      notify("Failed to update username: " + err.message, "error");
    } finally {
      setUsernameBusy(false);
    }
  };

  const handleSaveWarehouseConfig = async () => {
    setWcBusy(true);
    try {
      await usersMetaRef.set({
        warehouseConfig: { units: Number(wcUnits) || 1, shelves: Number(wcShelves) || 1, rows: Number(wcRows) || 1 },
      }, { merge: true });
      await refreshUsersMeta();
      notify("Warehouse configuration saved.", "success");
    } catch (err) {
      notify("Failed to save warehouse config: " + err.message, "error");
    } finally {
      setWcBusy(false);
    }
  };

  const saveCategories = async (next) => {
    try {
      await usersMetaRef.set({ categories: next }, { merge: true });
      await refreshUsersMeta();
    } catch (err) {
      notify("Failed to save categories: " + err.message, "error");
    }
  };

  const addCategory = async () => {
    const name = newCatName.trim();
    if (!name) return;
    if (categories[name]) { notify("That category already exists.", "error"); return; }
    await saveCategories({ ...categories, [name]: newCatColor });
    setNewCatName("");
    notify("Category added.", "success");
  };

  const updateCategoryColor = async (name, color) => {
    await saveCategories({ ...categories, [name]: color });
  };

  const removeCategory = async (name) => {
    if (!confirm('Delete category "' + name + '"?')) return;
    const next = { ...categories };
    delete next[name];
    await saveCategories(next);
    notify("Category removed.", "success");
  };

  const saveCustomFields = async (next) => {
    try {
      await usersMetaRef.set({ customFields: next }, { merge: true });
      await refreshUsersMeta();
    } catch (err) {
      notify("Failed to save custom fields: " + err.message, "error");
    }
  };

  const addCustomField = async () => {
    const label = newFieldLabel.trim();
    if (!label) return;
    if (customFields.some((f) => f.label.toLowerCase() === label.toLowerCase())) {
      notify("A custom field with that label already exists.", "error");
      return;
    }
    await saveCustomFields([...customFields, { id: genId(), label, type: newFieldType }]);
    setNewFieldLabel("");
    notify("Custom field added.", "success");
  };

  const removeCustomField = async (id) => {
    await saveCustomFields(customFields.filter((f) => f.id !== id));
    notify("Custom field removed.", "success");
  };

  const handleChangePassword = async () => {
    if (!curPw || !newPw || !confirmPw) { notify("All password fields are required.", "error"); return; }
    if (newPw !== confirmPw) { notify("New passwords do not match.", "error"); return; }
    if (newPw.length < 6) { notify("New password must be at least 6 characters.", "error"); return; }
    setPwBusy(true);
    try {
      const cred = firebase.auth.EmailAuthProvider.credential(authUser.email, curPw);
      await authUser.reauthenticateWithCredential(cred);
      await authUser.updatePassword(newPw);
      notify("Password updated.", "success");
      setCurPw(""); setNewPw(""); setConfirmPw("");
    } catch (err) {
      notify(fbErr(err.code), "error");
    } finally {
      setPwBusy(false);
    }
  };

  const handleExport = () => {
    const payload = {
      items,
      config: { units: warehouseConfig.units, shelves: warehouseConfig.shelves, rows: warehouseConfig.rows },
      shelves,
      mapLayout: settings.mapLayout || [],
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory-export.json";
    a.click();
    URL.revokeObjectURL(url);
    notify("Export downloaded.", "success");
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const rawItems = Array.isArray(parsed) ? parsed : parsed.items;
        if (!Array.isArray(rawItems)) {
          notify("Invalid file: no items array found.", "error");
          return;
        }
        const normItems = normalizeImportItems(rawItems);
        const normShelves = Array.isArray(parsed.shelves) ? parsed.shelves : [];
        const mapLayout = Array.isArray(parsed.mapLayout) ? parsed.mapLayout : null;
        const config = parsed.config && typeof parsed.config === "object" ? parsed.config : null;
        setImportPreview({ items: normItems, shelves: normShelves, mapLayout, config });
        notify("File parsed — review the preview below.", "info");
      } catch (err) {
        notify("Failed to parse JSON: " + err.message, "error");
      }
    };
    reader.readAsText(file);
  };

  const runImportMerge = async () => {
    if (!importPreview) return;
    setImportBusy(true);
    try {
      const existingSkus = new Set(items.filter((it) => it.sku).map((it) => it.sku));
      const coll = db.collection("users").doc(authUser.uid).collection("items");
      let added = 0;
      for (const it of importPreview.items) {
        if (it.sku && existingSkus.has(it.sku)) continue;
        await coll.add({ ...it, addedAt: Date.now() });
        added++;
      }
      notify("Merged " + added + " item(s).", "success");
      setImportPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      notify("Import failed: " + err.message, "error");
    } finally {
      setImportBusy(false);
    }
  };

  const runImportReplace = async () => {
    if (!importPreview) return;
    if (!confirm("Replace ALL existing items" + (importPreview.shelves.length ? " and shelves" : "") + " with the imported data? This cannot be undone.")) return;
    setImportBusy(true);
    try {
      const itemsColl = db.collection("users").doc(authUser.uid).collection("items");
      const shelvesColl = db.collection("users").doc(authUser.uid).collection("shelves");

      const existingItems = await itemsColl.get();
      let batch = db.batch();
      let opCount = 0;
      const commitIfNeeded = async () => {
        if (opCount >= 450) { await batch.commit(); batch = db.batch(); opCount = 0; }
      };
      for (const doc of existingItems.docs) { batch.delete(doc.ref); opCount++; await commitIfNeeded(); }

      if (importPreview.shelves.length > 0) {
        const existingShelves = await shelvesColl.get();
        for (const doc of existingShelves.docs) { batch.delete(doc.ref); opCount++; await commitIfNeeded(); }
      }

      for (const it of importPreview.items) {
        const ref = itemsColl.doc();
        batch.set(ref, { ...it, addedAt: Date.now() });
        opCount++; await commitIfNeeded();
      }
      if (importPreview.shelves.length > 0) {
        for (const s of importPreview.shelves) {
          const sref = shelvesColl.doc();
          const sCopy = { ...s };
          delete sCopy.id;
          batch.set(sref, { ...sCopy, createdAt: Date.now() });
          opCount++; await commitIfNeeded();
        }
      }
      await batch.commit();

      const metaUpdates = {};
      if (importPreview.mapLayout) {
        await db.collection("users").doc(authUser.uid).collection("meta").doc("settings").set({ mapLayout: importPreview.mapLayout }, { merge: true });
        setSettings((s) => ({ ...s, mapLayout: importPreview.mapLayout }));
      }
      if (importPreview.config) {
        metaUpdates.warehouseConfig = { units: importPreview.config.units || 1, shelves: importPreview.config.shelves || 1, rows: importPreview.config.rows || 1 };
      }
      if (Object.keys(metaUpdates).length > 0) {
        await usersMetaRef.set(metaUpdates, { merge: true });
        await refreshUsersMeta();
      }

      notify("Replaced inventory with " + importPreview.items.length + " item(s).", "success");
      setImportPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      notify("Import failed: " + err.message, "error");
    } finally {
      setImportBusy(false);
    }
  };

  const handleSignOut = async () => { await auth.signOut(); };

  return (
    <div>
      <h1 className="page-title">Settings</h1>
      <p className="page-sub">Manage your account, warehouse, and data.</p>

      <div className="tabs">
        {SETTINGS_TABS.map((t) => (
          <button key={t.key} className={"tab-btn" + (tab === t.key ? " active" : "")} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "appearance" && (
        <div className="card" style={{ maxWidth: 420 }}>
          <h3 className="panel-title">Appearance</h3>
          <ThemeToggle />
        </div>
      )}

      {tab === "account" && (
        <div className="card" style={{ maxWidth: 480 }}>
          <h3 className="panel-title">Account</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: "0.88rem" }}>
            <div><strong>Email:</strong> {authUser.email}</div>
            <div><strong>Username:</strong> {username || "—"}</div>
            <div><strong>Role:</strong> {isAdmin ? "Administrator" : "User"}</div>
            <div><strong>Total Items:</strong> {items.length}</div>
            <div><strong>Total Units:</strong> {items.reduce((s, it) => s + (Number(it.quantity) || 0), 0)}</div>
            <div><strong>Shelves:</strong> {shelves.length}</div>
            <div><strong>UID:</strong> <span style={{ fontFamily: "monospace", userSelect: "all" }}>{authUser.uid}</span></div>
            <span className="badge badge-success" style={{ width: "fit-content" }}>Your data is secure</span>
          </div>

          <h3 className="panel-title" style={{ marginTop: 22 }}>Change Username</h3>
          <div className="field-row">
            <div className="field" style={{ flex: 1 }}>
              <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleChangeUsername} disabled={usernameBusy}>
              {usernameBusy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}

      {tab === "warehouse" && (
        <div className="card" style={{ maxWidth: 420 }}>
          <h3 className="panel-title">Warehouse Config</h3>
          <div className="field">
            <label>Units</label>
            <input type="number" min="1" value={wcUnits} onChange={(e) => setWcUnits(e.target.value)} />
          </div>
          <div className="field">
            <label>Shelves per Unit</label>
            <input type="number" min="1" value={wcShelves} onChange={(e) => setWcShelves(e.target.value)} />
          </div>
          <div className="field">
            <label>Rows per Shelf</label>
            <input type="number" min="1" value={wcRows} onChange={(e) => setWcRows(e.target.value)} />
          </div>
          <p className="field-hint">Total slots: {(Number(wcUnits) || 0) * (Number(wcShelves) || 0) * (Number(wcRows) || 0)}</p>
          <button className="btn btn-primary" onClick={handleSaveWarehouseConfig} disabled={wcBusy}>
            {wcBusy ? "Saving…" : "Save"}
          </button>
        </div>
      )}

      {tab === "categories" && (
        <div className="card" style={{ maxWidth: 480 }}>
          <h3 className="panel-title">Categories</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {Object.entries(categories).map(([name, color]) => (
              <div key={name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="color" value={color} onChange={(e) => updateCategoryColor(name, e.target.value)} style={{ width: 28, height: 28, padding: 0, border: "none", background: "none" }} />
                <span style={{ flex: 1 }}>{name}</span>
                <button className="icon-btn" onClick={() => removeCategory(name)}><Icon name="trash" size={15} /></button>
              </div>
            ))}
          </div>
          <div className="field-row">
            <div className="field" style={{ flex: 1 }}>
              <label>New Category Name</label>
              <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
            </div>
            <div className="field">
              <label>Color</label>
              <input type="color" value={newCatColor} onChange={(e) => setNewCatColor(e.target.value)} style={{ width: 40, height: 36, padding: 0, border: "none", background: "none" }} />
            </div>
          </div>
          <button className="btn btn-primary" onClick={addCategory}>Add Category</button>
        </div>
      )}

      {tab === "fields" && (
        <div className="card" style={{ maxWidth: 480 }}>
          <h3 className="panel-title">Custom Item Fields</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {customFields.length === 0 && <div className="empty-state">No custom fields yet.</div>}
            {customFields.map((f) => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ flex: 1 }}>{f.label}</span>
                <span className="badge badge-muted">{f.type}</span>
                <button className="icon-btn" onClick={() => removeCustomField(f.id)}><Icon name="trash" size={15} /></button>
              </div>
            ))}
          </div>
          <div className="field-row">
            <div className="field" style={{ flex: 1 }}>
              <label>Label</label>
              <input type="text" value={newFieldLabel} onChange={(e) => setNewFieldLabel(e.target.value)} />
            </div>
            <div className="field">
              <label>Type</label>
              <select value={newFieldType} onChange={(e) => setNewFieldType(e.target.value)}>
                {CUSTOM_FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <button className="btn btn-primary" onClick={addCustomField}>Add Field</button>
        </div>
      )}

      {tab === "password" && (
        <div className="card" style={{ maxWidth: 420 }}>
          <h3 className="panel-title">Change Password</h3>
          <div className="field">
            <label>Current Password</label>
            <input type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} />
          </div>
          <div className="field">
            <label>New Password</label>
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          </div>
          <div className="field">
            <label>Confirm New Password</label>
            <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={handleChangePassword} disabled={pwBusy}>
            {pwBusy ? "Updating…" : "Update Password"}
          </button>
        </div>
      )}

      {tab === "data" && (
        <div className="card" style={{ maxWidth: 560 }}>
          <h3 className="panel-title">Data Management</h3>
          <div style={{ marginBottom: 24 }}>
            <h4 style={{ margin: "0 0 8px" }}>Export</h4>
            <button className="btn btn-secondary" onClick={handleExport}>Download JSON Export</button>
          </div>
          <div>
            <h4 style={{ margin: "0 0 8px" }}>Import</h4>
            <input ref={fileInputRef} type="file" accept="application/json" onChange={handleFileSelect} />
            {importPreview && (
              <div style={{ marginTop: 14, padding: 12, border: "1px solid var(--border)", borderRadius: 8 }}>
                <div style={{ fontSize: "0.85rem", marginBottom: 10 }}>
                  <div>{importPreview.items.length} item(s) found</div>
                  {importPreview.shelves.length > 0 && <div>{importPreview.shelves.length} shelf(ves) found</div>}
                  {importPreview.config && <div>Warehouse config: {importPreview.config.units}×{importPreview.config.shelves}×{importPreview.config.rows}</div>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-success btn-sm" onClick={runImportMerge} disabled={importBusy}>Merge</button>
                  <button className="btn btn-danger btn-sm" onClick={runImportReplace} disabled={importBusy}>Replace All</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setImportPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} disabled={importBusy}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <button className="btn btn-danger" onClick={handleSignOut}>
          <Icon name="logout" size={15} /> Sign Out
        </button>
      </div>
    </div>
  );
}
function Support(props) { return <div className="empty-state">Support — coming soon.</div>; }
function AdminPanel(props) { return <div className="empty-state">Admin Panel — coming soon.</div>; }

// ============================================================
// ROOT MOUNT
// ============================================================
ReactDOM.createRoot(document.getElementById("root")).render(
  <ThemeProvider>
    <ToastProvider>
      <App />
    </ToastProvider>
  </ThemeProvider>
);
