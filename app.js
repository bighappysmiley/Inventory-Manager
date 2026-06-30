// Inventory Manager — by BigHappySmiley
// Single-file React app (in-browser Babel transform, no bundler).
const { useState, useEffect, useRef, useContext, createContext, useMemo, useCallback } = React;

// ============================================================
// FIREBASE INIT
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyCyulAGSax77ZqiSxYD4Z1_szcviDj0HxQ",
  authDomain: "inventory-manager-bhs.firebaseapp.com",
  projectId: "inventory-manager-bhs",
  storageBucket: "inventory-manager-bhs.firebasestorage.app",
  messagingSenderId: "105793119792",
  appId: "1:105793119792:web:fc6d697587870b471aeff5",
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
const TICKET_PRIORITIES = ["low", "medium", "high"];
const TICKET_PRIORITY_BADGE = { low: "badge-muted", medium: "badge-info", high: "badge-danger" };

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
  { key: "support", label: "Support", icon: "support" },
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
            title={collapsed ? (n.key === "support" && isAdmin ? "Tickets" : n.label) : undefined}
          >
            <span className="nav-icon"><Icon name={n.icon} size={17} /></span>
            {!collapsed && <span>{n.key === "support" && isAdmin ? "Tickets" : n.label}</span>}
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

  // Live support ticket subscription (for nav badge + Support/Tickets view).
  // Admins see every ticket; regular users see only their own.
  useEffect(() => {
    if (!authUser) { setSupportTickets([]); return; }
    const query = isAdmin
      ? db.collection("support_tickets")
      : db.collection("support_tickets").where("authorUid", "==", authUser.uid);
    const unsub = query.onSnapshot((snap) => {
      setSupportTickets(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (e) => console.warn("support_tickets subscription error:", e));
    return () => unsub();
  }, [authUser, isAdmin]);

  // Defense in depth: redirect non-admins away from admin-only views
  useEffect(() => {
    if (view === "admin" && !isAdmin) {
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
  else if (view === "support") content = <Support {...sharedProps} />;
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
const MAP_CANVAS_W = 900;
const MAP_CANVAS_H = 520;

function WarehouseMap2D({ authUser, shelves, items, settings, setSettings, notify }) {
  const [layout, setLayout] = useState(settings.mapLayout || []);
  const layoutRef = useRef(layout);
  const dragRef = useRef(null); // { id, offsetX, offsetY }
  const containerRef = useRef(null);

  useEffect(() => { layoutRef.current = layout; }, [layout]);
  useEffect(() => { setLayout(settings.mapLayout || []); }, [settings.mapLayout]);

  const persistLayout = async (next) => {
    setSettings((s) => ({ ...s, mapLayout: next }));
    try {
      await db.collection("users").doc(authUser.uid).collection("meta").doc("settings").set({ mapLayout: next }, { merge: true });
    } catch (err) {
      notify("Failed to save map layout: " + err.message, "error");
    }
  };

  const addToMap = (shelf) => {
    if (layoutRef.current.some((m) => m.id === shelf.id)) return;
    const next = [...layoutRef.current, { id: shelf.id, x: 20 + (layoutRef.current.length % 5) * 30, y: 20 + (layoutRef.current.length % 5) * 30, w: 130, h: 90 }];
    setLayout(next);
    persistLayout(next);
  };

  const removeFromMap = (shelf) => {
    const next = layoutRef.current.filter((m) => m.id !== shelf.id);
    setLayout(next);
    persistLayout(next);
  };

  const onMouseDown = (e, entry) => {
    const rect = containerRef.current.getBoundingClientRect();
    dragRef.current = {
      id: entry.id,
      offsetX: e.clientX - rect.left - entry.x,
      offsetY: e.clientY - rect.top - entry.y,
    };
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const entry = layoutRef.current.find((m) => m.id === dragRef.current.id);
      if (!entry) return;
      let x = e.clientX - rect.left - dragRef.current.offsetX;
      let y = e.clientY - rect.top - dragRef.current.offsetY;
      x = Math.max(0, Math.min(MAP_CANVAS_W - entry.w, x));
      y = Math.max(0, Math.min(MAP_CANVAS_H - entry.h, y));
      const next = layoutRef.current.map((m) => m.id === entry.id ? { ...m, x, y } : m);
      layoutRef.current = next;
      setLayout(next);
    };
    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      persistLayout(layoutRef.current);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const itemCountForShelf = (shelf) => items.filter((it) => it.location === shelf.name).length;
  const placedIds = new Set(layout.map((m) => m.id));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 18 }}>
      <div
        ref={containerRef}
        className="card"
        style={{ position: "relative", width: MAP_CANVAS_W, height: MAP_CANVAS_H, overflow: "hidden", padding: 0 }}
      >
        {layout.map((entry) => {
          const shelf = shelves.find((s) => s.id === entry.id);
          if (!shelf) return null;
          return (
            <div
              key={entry.id}
              onMouseDown={(e) => onMouseDown(e, entry)}
              style={{
                position: "absolute", left: entry.x, top: entry.y, width: entry.w, height: entry.h,
                background: (shelf.color || "#7c3aed") + "26", border: "2px solid " + (shelf.color || "#7c3aed"),
                borderRadius: 8, cursor: "grab", padding: 8, userSelect: "none",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: "0.82rem" }}>{shelf.name}</div>
              <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{itemCountForShelf(shelf)} item(s)</div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <h3 className="panel-title">Shelves</h3>
        {shelves.length === 0 ? (
          <div className="empty-state">No shelves configured yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {shelves.map((shelf) => {
              const placed = placedIds.has(shelf.id);
              return (
                <div key={shelf.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="dot" style={{ background: shelf.color || "#7c3aed" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{shelf.name}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{itemCountForShelf(shelf)} item(s)</div>
                  </div>
                  <button className="btn btn-sm btn-secondary" onClick={() => placed ? removeFromMap(shelf) : addToMap(shelf)}>
                    {placed ? "Remove" : "Add"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 3D WAREHOUSE WALKTHROUGH
// ============================================================
const WORLD_W = 36;
const WORLD_D = 24;
const WALL_H = 7;
const MOVE_SPEED = 4.2;
const SPRINT_MULT = 1.9;
const EYE_HEIGHT = 1.7;

function makeCanvasTexture(draw, w = 256, h = 128) {
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function makeFloorTexture() {
  return makeCanvasTexture((ctx, w, h) => {
    ctx.fillStyle = "#c9cdd6";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;
    const tile = 32;
    for (let x = 0; x <= w; x += tile) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y <= h; y += tile) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.fillStyle = "#f2c200";
    ctx.fillRect(0, h / 2 - 4, w, 8);
  }, 512, 512);
}

function makeSignTexture(title, sub1, sub2, color) {
  return makeCanvasTexture((ctx, w, h) => {
    ctx.fillStyle = "#13161e";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, 8);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 26px Arial";
    ctx.fillText(title, 12, 44);
    ctx.font = "16px Arial";
    ctx.fillStyle = "#cfd3e0";
    ctx.fillText(sub1, 12, 72);
    ctx.fillText(sub2, 12, 96);
  }, 320, 128);
}

function makeItemLabelTexture(item, color) {
  return makeCanvasTexture((ctx, w, h) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, 6);
    ctx.fillStyle = "#111";
    ctx.font = "bold 15px Arial";
    ctx.fillText((item.category || "Other"), 8, 24);
    ctx.font = "bold 13px Arial";
    ctx.fillText((item.name || "Item").slice(0, 18), 8, 42);
    ctx.font = "11px Arial";
    ctx.fillStyle = "#444";
    ctx.fillText("Qty: " + (item.quantity != null ? item.quantity : "—"), 8, 58);
    ctx.fillText("SKU: " + (item.sku || "—"), 8, 72);
  }, 200, 90);
}

function buildShelfGroup(shelf, items) {
  const group = new THREE.Group();
  const rows = Math.max(1, shelf.rows || 1);
  const cols = Math.max(1, shelf.cols || 1);
  const width = Math.max(2, cols * 0.9);
  const depth = 1.0;
  const height = Math.max(1.5, rows * 0.65 + 0.4);
  const color = new THREE.Color(shelf.color || "#7c3aed");

  const steelMat = new THREE.MeshStandardMaterial({ color: 0x8a8f9e, metalness: 0.6, roughness: 0.4 });
  const backMat = new THREE.MeshStandardMaterial({ color: 0xb6bac6, metalness: 0.3, roughness: 0.6 });

  const back = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.05), backMat);
  back.position.set(0, height / 2, -depth / 2 + 0.025);
  back.castShadow = true; back.receiveShadow = true;
  group.add(back);

  [-width / 2, width / 2].forEach((sx) => {
    const upright = new THREE.Mesh(new THREE.BoxGeometry(0.08, height, depth), steelMat);
    upright.position.set(sx, height / 2, 0);
    upright.castShadow = true;
    group.add(upright);
    for (let b = 0; b < 3; b++) {
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 8), new THREE.MeshStandardMaterial({ color: 0x3a3d46 }));
      bolt.rotation.x = Math.PI / 2;
      bolt.position.set(sx, 0.3 + b * (height / 3), depth / 2 - 0.03);
      group.add(bolt);
    }
  });

  const boardH = height / rows;
  for (let r = 0; r <= rows; r++) {
    const board = new THREE.Mesh(new THREE.BoxGeometry(width, 0.05, depth), steelMat);
    board.position.set(0, r * boardH, 0);
    board.castShadow = true; board.receiveShadow = true;
    group.add(board);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(width, 0.06, 0.04), steelMat);
    lip.position.set(0, r * boardH + 0.03, depth / 2 - 0.02);
    group.add(lip);
  }

  const itemMeshes = [];
  const capacity = rows * cols;
  const shelfItems = items.slice(0, capacity);
  shelfItems.forEach((item, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const boxSize = 0.32;
    const catColor = item.__categoryColor || "#6b7094";
    const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(catColor), roughness: 0.55 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(boxSize, boxSize, boxSize), mat);
    const x = -width / 2 + (col + 0.5) * (width / cols);
    const y = row * boardH + boxSize / 2 + 0.04;
    const z = 0;
    box.position.set(x, y, z);
    box.castShadow = true;
    group.add(box);

    const labelTex = makeItemLabelTexture(item, catColor);
    const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true });
    const label = new THREE.Mesh(new THREE.PlaneGeometry(boxSize * 1.4, boxSize * 0.65), labelMat);
    label.position.set(x, y + boxSize * 0.55, z + depth / 2 + 0.01);
    group.add(label);

    itemMeshes.push({ mesh: box, item });
  });

  const signTex = makeSignTexture(shelf.name, shelfItems.length + "/" + capacity + " slots filled", rows + " rows × " + cols + " cols", shelf.color || "#7c3aed");
  const signMat = new THREE.MeshBasicMaterial({ map: signTex, transparent: true });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.72), signMat);
  sign.position.set(0, height + 0.5, 0);
  group.add(sign);

  return { group, itemMeshes };
}

function WarehouseMap3D({ shelves, items, settings, categories }) {
  const mountRef = useRef(null);
  const stateRef = useRef({});
  const [entered, setEntered] = useState(false);
  const [fps, setFps] = useState(0);
  const [selectedItem, setSelectedItem] = useState(null);

  const mapLayout = settings.mapLayout || [];
  const hasShelvesOnMap = mapLayout.length > 0 && shelves.length > 0;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xbfe0f5);
    scene.fog = new THREE.Fog(0xbfe0f5, 14, 40);

    const camera = new THREE.PerspectiveCamera(70, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(0, EYE_HEIGHT, WORLD_D / 2 - 2);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if (renderer.outputEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    mount.appendChild(renderer.domElement);

    // Lights
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(10, 16, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -20; sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 20; sun.shadow.camera.bottom = -20;
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const fill = new THREE.HemisphereLight(0xddeeff, 0x444455, 0.4);
    scene.add(fill);

    // Floor
    const floorTex = makeFloorTexture();
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(WORLD_W / 4, WORLD_D / 4);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD_W, WORLD_D),
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Walls + baseboards
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf5f6f8, roughness: 0.9 });
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x8d909c, roughness: 0.7 });
    const wallDefs = [
      { w: WORLD_W, d: 0.2, x: 0, z: -WORLD_D / 2 },
      { w: WORLD_W, d: 0.2, x: 0, z: WORLD_D / 2 },
      { w: 0.2, d: WORLD_D, x: -WORLD_W / 2, z: 0 },
      { w: 0.2, d: WORLD_D, x: WORLD_W / 2, z: 0 },
    ];
    wallDefs.forEach((d) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(d.w, WALL_H, d.d), wallMat);
      wall.position.set(d.x, WALL_H / 2, d.z);
      wall.receiveShadow = true;
      scene.add(wall);
      const base = new THREE.Mesh(new THREE.BoxGeometry(d.w, 0.3, d.d + 0.05), baseMat);
      base.position.set(d.x, 0.15, d.z);
      scene.add(base);
    });

    // Ceiling beams + fixtures
    for (let i = -1; i <= 1; i++) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, WORLD_D), new THREE.MeshStandardMaterial({ color: 0x9a9da6 }));
      beam.position.set(i * (WORLD_W / 3), WALL_H - 0.2, 0);
      scene.add(beam);
      const fixture = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.1, 0.3),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.2 })
      );
      fixture.position.set(i * (WORLD_W / 3), WALL_H - 0.4, 0);
      scene.add(fixture);
      const fixtureLight = new THREE.PointLight(0xffffff, 0.6, 14);
      fixtureLight.position.set(i * (WORLD_W / 3), WALL_H - 0.6, 0);
      scene.add(fixtureLight);
    }

    // Shelves
    const itemMeshes = [];
    mapLayout.forEach((entry) => {
      const shelf = shelves.find((s) => s.id === entry.id);
      if (!shelf) return;
      const shelfItems = items
        .filter((it) => it.location === shelf.name)
        .map((it) => ({ ...it, __categoryColor: categories[it.category] || "#6b7094" }));
      const { group, itemMeshes: meshes } = buildShelfGroup(shelf, shelfItems);
      const wx = (entry.x / MAP_CANVAS_W - 0.5) * (WORLD_W - 4);
      const wz = (entry.y / MAP_CANVAS_H - 0.5) * (WORLD_D - 4);
      group.position.set(wx, 0, wz);
      scene.add(group);
      meshes.forEach((m) => {
        itemMeshes.push(m);
      });
    });

    // Hover outline
    const outline = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0xffb000, wireframe: true })
    );
    outline.visible = false;
    scene.add(outline);

    const raycaster = new THREE.Raycaster();
    const center = new THREE.Vector2(0, 0);

    // Movement state
    const keys = {};
    let yaw = 0; // yaw 0 faces -Z, matching the spawn point looking into the room
    let pitch = 0;
    let walkDist = 0;
    const onKeyDown = (e) => {
      keys[e.code] = true;
      if (e.code === "Escape") {
        setSelectedItem(null);
        if (document.pointerLockElement === mount) document.exitPointerLock();
      }
      if (e.code === "KeyE" && document.pointerLockElement === mount) {
        inspectUnderCrosshair();
      }
    };
    const onKeyUp = (e) => { keys[e.code] = false; };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const onMouseMove = (e) => {
      if (document.pointerLockElement !== mount) return;
      yaw -= e.movementX * 0.0022;
      pitch -= e.movementY * 0.0022;
      pitch = Math.max(-1.3, Math.min(1.3, pitch));
    };
    document.addEventListener("mousemove", onMouseMove);

    function inspectUnderCrosshair() {
      raycaster.setFromCamera(center, camera);
      const hits = raycaster.intersectObjects(itemMeshes.map((m) => m.mesh));
      if (hits.length > 0) {
        const hit = itemMeshes.find((m) => m.mesh === hits[0].object);
        if (hit) setSelectedItem(hit.item);
      }
    }

    const onClick = () => {
      if (document.pointerLockElement !== mount) {
        mount.requestPointerLock();
      } else {
        inspectUnderCrosshair();
      }
    };
    mount.addEventListener("click", onClick);

    const onPointerLockChange = () => {
      setEntered(document.pointerLockElement === mount);
    };
    document.addEventListener("pointerlockchange", onPointerLockChange);

    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    let lastTime = performance.now();
    let frameAccum = 0, frameCount = 0;
    let raf = null;

    function animate() {
      raf = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      frameAccum += dt; frameCount++;
      if (frameAccum >= 0.4) {
        setFps(Math.round(frameCount / frameAccum));
        frameAccum = 0; frameCount = 0;
      }

      if (document.pointerLockElement === mount) {
        const sprint = keys["ShiftLeft"] || keys["ShiftRight"];
        const speed = MOVE_SPEED * (sprint ? SPRINT_MULT : 1) * dt;
        const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
        const right = new THREE.Vector3(Math.sin(yaw + Math.PI / 2), 0, Math.cos(yaw + Math.PI / 2));
        let moved = false;
        const move = new THREE.Vector3();
        if (keys["KeyW"] || keys["ArrowUp"]) { move.add(forward); moved = true; }
        if (keys["KeyS"] || keys["ArrowDown"]) { move.sub(forward); moved = true; }
        if (keys["KeyA"] || keys["ArrowLeft"]) { move.sub(right); moved = true; }
        if (keys["KeyD"] || keys["ArrowRight"]) { move.add(right); moved = true; }
        if (moved) {
          move.normalize().multiplyScalar(speed);
          const nx = camera.position.x + move.x;
          const nz = camera.position.z + move.z;
          camera.position.x = Math.max(-WORLD_W / 2 + 0.5, Math.min(WORLD_W / 2 - 0.5, nx));
          camera.position.z = Math.max(-WORLD_D / 2 + 0.5, Math.min(WORLD_D / 2 - 0.5, nz));
          walkDist += speed;
        }
        camera.position.y = EYE_HEIGHT + Math.sin(walkDist * 6) * (moved ? 0.04 : 0);

        camera.rotation.order = "YXZ";
        camera.rotation.y = yaw;
        camera.rotation.x = pitch;

        raycaster.setFromCamera(center, camera);
        const hits = raycaster.intersectObjects(itemMeshes.map((m) => m.mesh));
        if (hits.length > 0 && hits[0].distance < 4) {
          const obj = hits[0].object;
          obj.geometry.computeBoundingBox();
          obj.getWorldPosition(outline.position);
          outline.scale.set(1, 1, 1);
          outline.geometry.dispose();
          outline.geometry = new THREE.BoxGeometry(
            obj.geometry.parameters.width * 1.15,
            obj.geometry.parameters.height * 1.15,
            obj.geometry.parameters.depth * 1.15
          );
          outline.visible = true;
        } else {
          outline.visible = false;
        }
      }

      renderer.render(scene, camera);
    }
    animate();

    stateRef.current = { renderer, mount };

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      window.removeEventListener("resize", onResize);
      mount.removeEventListener("click", onClick);
      if (document.pointerLockElement === mount) document.exitPointerLock();
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [shelves, items, settings.mapLayout, categories]);

  return (
    <div style={{ position: "relative", width: "100%", height: 560, borderRadius: 12, overflow: "hidden", background: "#bfe0f5" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

      {!entered && (
        <div
          onClick={() => mountRef.current && mountRef.current.requestPointerLock()}
          style={{
            position: "absolute", inset: 0, background: "rgba(10,12,18,0.55)", color: "#fff",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, textAlign: "center", padding: 20,
            cursor: "pointer",
          }}>
          <h2 style={{ margin: 0 }}>Click to Enter</h2>
          {!hasShelvesOnMap && (
            <p style={{ color: "#ffce6b", maxWidth: 360 }}>
              No shelves are placed on the map yet — add shelves to the 2D Floor Plan first.
            </p>
          )}
          <p style={{ maxWidth: 380, fontSize: "0.85rem", opacity: 0.85 }}>
            WASD / Arrows to move · Mouse to look · Shift to sprint<br />
            Click or press E to inspect · Esc to exit
          </p>
        </div>
      )}

      {entered && (
        <div style={{ position: "absolute", top: 12, left: 12, background: "rgba(0,0,0,0.5)", color: "#fff", padding: "4px 10px", borderRadius: 6, fontSize: "0.75rem", fontFamily: "monospace" }}>
          {fps} FPS
        </div>
      )}

      {entered && (
        <div style={{ position: "absolute", bottom: 12, left: 12, background: "rgba(0,0,0,0.5)", borderRadius: 8, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
          {Object.entries(categories).map(([cat, color]) => (
            <div key={cat} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.7rem", color: "#fff" }}>
              <span className="dot" style={{ background: color }} /> {cat}
            </div>
          ))}
        </div>
      )}

      {selectedItem && (
        <div style={{
          position: "absolute", top: 12, right: 12, width: 240, background: "rgba(15,17,25,0.85)",
          backdropFilter: "blur(6px)", borderRadius: 10, padding: 14, color: "#fff",
          borderLeft: "4px solid " + (categories[selectedItem.category] || "#7c3aed"),
        }}>
          <button className="icon-btn" style={{ float: "right", color: "#fff" }} onClick={() => setSelectedItem(null)}><Icon name="x" size={14} /></button>
          <h3 style={{ margin: "0 0 8px", fontSize: "1rem" }}>{selectedItem.name}</h3>
          <div style={{ fontSize: "0.78rem", display: "flex", flexDirection: "column", gap: 4, opacity: 0.9 }}>
            <div>Category: {selectedItem.category || "Other"}</div>
            <div>Quantity: {selectedItem.quantity}</div>
            <div>SKU: {selectedItem.sku || "—"}</div>
            <div>Min Stock: {selectedItem.minStock || 0}</div>
            <div>Price: ${selectedItem.price || 0}</div>
            <div>Location: {compactLocation(selectedItem)}</div>
            {selectedItem.notes && <div>Notes: {selectedItem.notes}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function WarehouseMap(props) {
  const [mode, setMode] = useState("3d");
  return (
    <div>
      <h1 className="page-title">Warehouse Map</h1>
      <p className="page-sub">Visualize and arrange your storage layout.</p>
      <div className="tabs">
        <button className={"tab-btn" + (mode === "3d" ? " active" : "")} onClick={() => setMode("3d")}>3D Walkthrough</button>
        <button className={"tab-btn" + (mode === "2d" ? " active" : "")} onClick={() => setMode("2d")}>2D Floor Plan</button>
      </div>
      {mode === "2d" ? <WarehouseMap2D {...props} /> : <WarehouseMap3D {...props} />}
    </div>
  );
}
const EMPTY_SHELF_FORM = { name: "", rows: 4, cols: 4, type: "Standard", color: SHELF_COLOR_PRESETS[0] };

function ShelfSlotGrid({ filled, color, rows, cols }) {
  const r = Math.max(1, Number(rows) || 1);
  const c = Math.max(1, Number(cols) || 1);
  const cellSize = r > 16 || c > 16 ? 8 : r > 10 || c > 10 ? 10 : 14;
  const total = r * c;
  const cells = [];
  for (let i = 0; i < total; i++) {
    cells.push(
      <div key={i} style={{
        width: cellSize, height: cellSize, borderRadius: 2,
        background: i < filled ? color : "var(--border)",
      }} />
    );
  }
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${c}, ${cellSize}px)`,
      gridTemplateRows: `repeat(${r}, ${cellSize}px)`,
      gap: 3,
    }}>
      {cells}
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

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            <h3 className="panel-title" style={{ marginBottom: 10 }}>Preview</h3>
            <div className="card" style={{ background: "var(--bg)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ margin: "0 0 2px" }}>{form.name.trim() || "Unnamed Shelf"}</h3>
                  <span className="badge badge-muted">{form.type}</span>
                </div>
              </div>
              <div style={{ margin: "12px 0" }}>
                <ShelfSlotGrid filled={0} rows={Number(form.rows) || 1} cols={Number(form.cols) || 1} color={form.color} />
              </div>
              <div className="progress-track" style={{ marginBottom: 6 }}>
                <div className="progress-fill" style={{ width: "0%", background: form.color }} />
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                {Number(form.rows) || 1}×{Number(form.cols) || 1} · 0% full
              </div>
            </div>
          </div>
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
                  <ShelfSlotGrid filled={filled} rows={shelf.rows || 1} cols={shelf.cols || 1} color={shelf.color} />
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
function Support({ authUser, isAdmin, username, notify, supportTickets }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [replies, setReplies] = useState([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newBody, setNewBody] = useState("");
  const [creating, setCreating] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const threadEndRef = useRef(null);

  const filteredTickets = useMemo(() => {
    const list = statusFilter === "all" ? supportTickets : supportTickets.filter((t) => t.status === statusFilter);
    return [...list].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [supportTickets, statusFilter]);

  const selectedTicket = supportTickets.find((t) => t.id === selectedId) || null;

  useEffect(() => {
    if (!selectedId) { setReplies([]); return; }
    const unsub = db.collection("support_tickets").doc(selectedId).collection("replies")
      .orderBy("createdAt", "asc")
      .onSnapshot((snap) => {
        setReplies(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }, (e) => console.warn("replies subscription error:", e));
    return () => unsub();
  }, [selectedId]);

  useEffect(() => {
    if (threadEndRef.current) threadEndRef.current.scrollIntoView({ block: "nearest" });
  }, [replies.length]);

  const createTicket = async () => {
    if (!newSubject.trim() || !newBody.trim()) { notify("Subject and message are required.", "error"); return; }
    setCreating(true);
    try {
      const ref = await db.collection("support_tickets").add({
        subject: newSubject.trim(),
        body: newBody.trim(),
        priority: newPriority,
        status: "open",
        authorEmail: authUser.email,
        authorUsername: username || authUser.email,
        authorUid: authUser.uid,
        createdAt: Date.now(),
      });
      setNewSubject(""); setNewBody(""); setNewPriority("medium"); setShowNewForm(false);
      setSelectedId(ref.id);
      notify("Ticket created.", "success");
    } catch (e) {
      notify("Failed to create ticket: " + e.message, "error");
    } finally {
      setCreating(false);
    }
  };

  const changeStatus = async (status) => {
    if (!isAdmin) { notify("Only admins can change ticket status.", "error"); return; }
    if (!selectedTicket || selectedTicket.status === status) return;
    setStatusBusy(true);
    try {
      await db.collection("support_tickets").doc(selectedTicket.id).update({ status, updatedAt: Date.now() });
    } catch (e) {
      notify("Failed to update status: " + e.message, "error");
    } finally {
      setStatusBusy(false);
    }
  };

  const sendReply = async () => {
    const body = replyText.trim();
    if (!body || !selectedTicket || selectedTicket.status === "closed") return;
    setSending(true);
    try {
      await db.collection("support_tickets").doc(selectedTicket.id).collection("replies").add({
        body,
        authorEmail: isAdmin ? "Admin" : authUser.email,
        authorUsername: isAdmin ? "Admin" : (username || authUser.email),
        authorUid: authUser.uid,
        isAdmin: !!isAdmin,
        createdAt: Date.now(),
      });
      await db.collection("support_tickets").doc(selectedTicket.id).update({ updatedAt: Date.now() });
      setReplyText("");
    } catch (e) {
      notify("Failed to send reply: " + e.message, "error");
    } finally {
      setSending(false);
    }
  };

  const onComposerKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
  };

  return (
    <div>
      <h1 className="page-title">{isAdmin ? "Tickets" : "Support"}</h1>
      <p className="page-sub">
        {isAdmin ? "Respond to open support tickets from users." : "Open a ticket and we'll get back to you."}
      </p>

      <div className="support-layout">
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowNewForm((s) => !s)}>
              <Icon name="add" size={14} /> New Ticket
            </button>
          </div>

          {showNewForm && (
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="field">
                <label>Subject</label>
                <input type="text" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} />
              </div>
              <div className="field">
                <label>Priority</label>
                <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)}>
                  {TICKET_PRIORITIES.map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Message</label>
                <textarea rows={4} value={newBody} onChange={(e) => setNewBody(e.target.value)} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={createTicket} disabled={creating}>
                  {creating ? "Creating…" : "Create Ticket"}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowNewForm(false)} disabled={creating}>Cancel</button>
              </div>
            </div>
          )}

          <div className="status-pills">
            <button className={"status-pill" + (statusFilter === "all" ? " active" : "")} onClick={() => setStatusFilter("all")}>All</button>
            {TICKET_STATUSES.map((s) => (
              <button key={s} className={"status-pill" + (statusFilter === s ? " active" : "")} onClick={() => setStatusFilter(s)}>
                {TICKET_STATUS_LABEL[s]}
              </button>
            ))}
          </div>

          <div className="ticket-list">
            {filteredTickets.length === 0 && <div className="empty-state">No tickets.</div>}
            {filteredTickets.map((t) => (
              <div key={t.id} className={"ticket-row" + (selectedId === t.id ? " active" : "")} onClick={() => setSelectedId(t.id)}>
                <div className="ticket-row-top">
                  <span className="ticket-subject">{t.subject}</span>
                  <span className={"badge " + (TICKET_STATUS_BADGE[t.status] || "badge-muted")}>{TICKET_STATUS_LABEL[t.status] || t.status}</span>
                </div>
                <div className="ticket-meta-row">
                  <span className={"badge " + (TICKET_PRIORITY_BADGE[t.priority] || "badge-muted")}>{t.priority}</span>
                  <span>{t.authorUsername || t.authorEmail}</span>
                  <span>·</span>
                  <span>{relTime(t.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          {!selectedTicket && <div className="empty-state">Select a ticket to view details.</div>}
          {selectedTicket && (
            <React.Fragment>
              <div className="ticket-detail-header">
                <div>
                  <h3 className="panel-title" style={{ marginBottom: 4 }}>{selectedTicket.subject}</h3>
                  <div className="ticket-meta-row">
                    <span>From {selectedTicket.authorUsername || selectedTicket.authorEmail}</span>
                    <span>·</span>
                    <span className={"badge " + (TICKET_PRIORITY_BADGE[selectedTicket.priority] || "badge-muted")}>{selectedTicket.priority}</span>
                    <span className={"badge " + (TICKET_STATUS_BADGE[selectedTicket.status] || "badge-muted")}>{TICKET_STATUS_LABEL[selectedTicket.status] || selectedTicket.status}</span>
                  </div>
                </div>
                {isAdmin ? (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {TICKET_STATUSES.map((s) => (
                      <button
                        key={s}
                        className={"btn btn-sm " + (selectedTicket.status === s ? "btn-primary" : "btn-secondary")}
                        disabled={statusBusy || selectedTicket.status === s}
                        onClick={() => changeStatus(s)}
                      >
                        {TICKET_STATUS_LABEL[s]}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="locked-notice">Status can only be changed by an admin.</div>
                )}
              </div>

              <div className="ticket-original">{selectedTicket.body}</div>

              <div className="chat-thread">
                {replies.map((r) => {
                  const own = r.authorUid === authUser.uid;
                  return (
                    <div key={r.id} className={"chat-bubble-row " + (own ? "own" : "other")}>
                      <div className="chat-bubble">{r.body}</div>
                      <div className="chat-bubble-meta">
                        {r.isAdmin && <span className="admin-badge">ADMIN</span>}
                        <span>{r.isAdmin ? "Admin" : (r.authorUsername || r.authorEmail)}</span>
                        <span>·</span>
                        <span>{relTime(r.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
                <div ref={threadEndRef} />
              </div>

              {selectedTicket.status === "closed" ? (
                <div className="closed-notice">This ticket is closed. Reopen it to add replies.</div>
              ) : (
                <div className="reply-composer">
                  <textarea
                    placeholder="Write a reply… (Enter to send, Shift+Enter for newline)"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={onComposerKeyDown}
                  />
                  <button className="btn btn-primary" onClick={sendReply} disabled={sending || !replyText.trim()}>Send</button>
                </div>
              )}
            </React.Fragment>
          )}
        </div>
      </div>
    </div>
  );
}
function AdminPanel({ authUser, notify }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUid, setSelectedUid] = useState(null);
  const [toggleBusy, setToggleBusy] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [metaSnap, adminsSnap] = await Promise.all([
        db.collection("users_meta").get(),
        db.collection("admins").get(),
      ]);
      const adminUids = new Set(adminsSnap.docs.map((d) => d.id));
      const list = metaSnap.docs.map((d) => ({
        uid: d.id,
        ...d.data(),
        isAdmin: adminUids.has(d.id),
      }));
      list.sort((a, b) => (a.email || "").localeCompare(b.email || ""));
      setUsers(list);
    } catch (e) {
      notify("Failed to load users: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (u.email || "").toLowerCase().includes(q) || u.uid.toLowerCase().includes(q);
  });

  const selectedUser = users.find((u) => u.uid === selectedUid) || null;

  const toggleAdmin = async (user) => {
    if (user.uid === authUser.uid && user.isAdmin) {
      notify("You can't remove your own admin access.", "error");
      return;
    }
    setToggleBusy(user.uid);
    try {
      if (user.isAdmin) {
        await db.collection("admins").doc(user.uid).delete();
      } else {
        await db.collection("admins").doc(user.uid).set({
          email: user.email || "",
          grantedBy: authUser.email,
          grantedAt: Date.now(),
        });
      }
      setUsers((prev) => prev.map((u) => (u.uid === user.uid ? { ...u, isAdmin: !u.isAdmin } : u)));
      notify(user.isAdmin ? "Admin access removed." : "Admin access granted.", "success");
    } catch (e) {
      notify("Failed to update role: " + e.message, "error");
    } finally {
      setToggleBusy(null);
    }
  };

  if (loading) {
    return <div className="empty-state">Loading users…</div>;
  }

  if (selectedUser) {
    const initial = (selectedUser.email || "?").charAt(0).toUpperCase();
    return (
      <div>
        <button className="btn btn-secondary btn-sm" style={{ marginBottom: 18 }} onClick={() => setSelectedUid(null)}>
          ← Back to Users
        </button>
        <div className="card" style={{ maxWidth: 480 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
            <div className="avatar-circle-lg">{initial}</div>
            <div>
              <div style={{ fontSize: "1.05rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                {selectedUser.email}
                {selectedUser.isAdmin && <span className="badge badge-info">ADMIN</span>}
                {selectedUser.uid === authUser.uid && <span className="badge badge-muted">you</span>}
              </div>
              <div className="ticket-row-uid" style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "var(--muted)" }}>{selectedUser.uid}</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
            <div className="field-row"><strong style={{ minWidth: 80 }}>Email</strong><span>{selectedUser.email}</span></div>
            <div className="field-row"><strong style={{ minWidth: 80 }}>UID</strong><span style={{ fontFamily: "monospace", fontSize: "0.82rem", userSelect: "all" }}>{selectedUser.uid}</span></div>
            <div className="field-row"><strong style={{ minWidth: 80 }}>Role</strong><span className={"badge " + (selectedUser.isAdmin ? "badge-info" : "badge-muted")}>{selectedUser.isAdmin ? "Admin" : "User"}</span></div>
          </div>
          <button
            className={"btn " + (selectedUser.isAdmin ? "btn-danger" : "btn-primary")}
            disabled={toggleBusy === selectedUser.uid}
            onClick={() => toggleAdmin(selectedUser)}
          >
            {selectedUser.isAdmin ? "Remove Admin Access" : "Grant Admin Access"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Admin Panel</h1>
      <p className="page-sub">Manage user roles. Other users' inventory data is not accessible here.</p>

      <div className="toolbar">
        <input type="text" placeholder="Search by email or UID…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="card" style={{ padding: 0 }}>
        {filtered.length === 0 && <div className="empty-state">No users found.</div>}
        {filtered.map((u) => {
          const initial = (u.email || "?").charAt(0).toUpperCase();
          return (
            <div key={u.uid} className="user-row">
              <div className="avatar-circle">{initial}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="user-row-email">{u.email}{u.uid === authUser.uid ? " (you)" : ""}</div>
                <div className="user-row-uid">{u.uid}</div>
              </div>
              <span className={"badge " + (u.isAdmin ? "badge-info" : "badge-muted")}>{u.isAdmin ? "Admin" : "User"}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedUid(u.uid)}>View</button>
              <button
                className={"btn btn-sm " + (u.isAdmin ? "btn-danger" : "btn-primary")}
                disabled={toggleBusy === u.uid}
                onClick={() => toggleAdmin(u)}
              >
                {u.isAdmin ? "Remove Admin" : "Make Admin"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
