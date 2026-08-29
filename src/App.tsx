import { useState, useRef, useCallback, useEffect } from "react";
import logoImg from "./imports/logo.jpg";

type Page = "auth" | "profile" | "upload" | "review" | "context" | "result" | "poll";
type AuthMode = "signin" | "signup";
type Profession = "business" | "student" | "working_professional" | "";

interface ProfileData {
  name: string;
  age: string;
  favoriteColor: string;
  gender: string;
  profession: Profession;
}

interface UploadedFile {
  id: string;
  url: string;
  name: string;
}

interface DayContext {
  weather: string;
  occasion: string;
}

interface OutfitCombo {
  top: UploadedFile;
  bottom: UploadedFile;
  score: number;
  label: string;
  useCount: number;
  date: string;
}

interface AnalyticsRecord {
  key: string;
  topName: string;
  bottomName: string;
  count: number;
  lastUsed: string;
}

const OUTFIT_LABELS = ["Perfect Match", "Office Ready", "Casual Chic", "Weekend Vibes", "Power Look", "Effortless Style"];

const PROFESSION_LABELS: Record<string, string> = {
  business: "Business",
  student: "Student",
  working_professional: "Working Professional",
};

const WEATHER_OPTIONS = [
  { id: "sunny", label: "Sunny", icon: "☀️" },
  { id: "cloudy", label: "Cloudy", icon: "☁️" },
  { id: "rainy", label: "Rainy", icon: "🌧️" },
  { id: "windy", label: "Windy", icon: "💨" },
  { id: "hot", label: "Hot", icon: "🔥" },
  { id: "cold", label: "Cold", icon: "❄️" },
];

const OCCASION_OPTIONS = [
  { id: "office", label: "Office / Work", icon: "💼" },
  { id: "casual", label: "Casual Day", icon: "😊" },
  { id: "formal", label: "Formal / Party", icon: "🎉" },
  { id: "date", label: "Date Night", icon: "💕" },
  { id: "college", label: "College", icon: "🎓" },
  { id: "festival", label: "Festival", icon: "🎊" },
  { id: "travel", label: "Travel", icon: "✈️" },
];

const ANALYTICS_KEY = "stylematch_analytics";

function loadAnalytics(): AnalyticsRecord[] {
  try {
    return JSON.parse(localStorage.getItem(ANALYTICS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveAnalytics(records: AnalyticsRecord[]) {
  localStorage.setItem(ANALYTICS_KEY, JSON.stringify(records));
}

function getUseCount(analytics: AnalyticsRecord[], top: UploadedFile, bottom: UploadedFile): number {
  const key = `${top.name}__${bottom.name}`;
  return analytics.find((r) => r.key === key)?.count ?? 0;
}

function recordOutfitUse(top: UploadedFile, bottom: UploadedFile) {
  const records = loadAnalytics();
  const key = `${top.name}__${bottom.name}`;
  const today = new Date().toISOString().split("T")[0];
  const existing = records.find((r) => r.key === key);
  if (existing) {
    existing.count += 1;
    existing.lastUsed = today;
  } else {
    records.push({ key, topName: top.name, bottomName: bottom.name, count: 1, lastUsed: today });
  }
  saveAnalytics(records);
}

// gender-based page background
function genderBg(gender: string): string {
  if (gender === "Male") return "linear-gradient(160deg, #dbeafe 0%, #eff6ff 60%, #e0f2fe 100%)";
  if (gender === "Female") return "linear-gradient(160deg, #fce7f3 0%, #fdf2f8 60%, #fff1f2 100%)";
  return "linear-gradient(160deg, #ede9fe 0%, #f5f3ff 60%, #faf5ff 100%)";
}

function genderAccent(gender: string): string {
  if (gender === "Male") return "#3b82f6";
  if (gender === "Female") return "#ec4899";
  return "#8b5cf6";
}

function genderAccentLight(gender: string): string {
  if (gender === "Male") return "#93c5fd";
  if (gender === "Female") return "#f9a8d4";
  return "#c4b5fd";
}

export default function App() {
  const [page, setPage] = useState<Page>("auth");
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState<ProfileData>({
    name: "", age: "", favoriteColor: "", gender: "", profession: "",
  });
  const [showProfessionMenu, setShowProfessionMenu] = useState(false);
  const [tops, setTops] = useState<UploadedFile[]>([]);
  const [bottoms, setBottoms] = useState<UploadedFile[]>([]);
  const [dayCtx, setDayCtx] = useState<DayContext>({ weather: "", occasion: "" });
  const [outfits, setOutfits] = useState<OutfitCombo[]>([]);
  const [generating, setGenerating] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsRecord[]>([]);
  const [pollVotes, setPollVotes] = useState<Record<number, number>>({});
  const [friendName, setFriendName] = useState("");
  const [pollSent, setPollSent] = useState(false);

  const topInputRef = useRef<HTMLInputElement>(null);
  const bottomInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setAnalytics(loadAnalytics()); }, []);

  const bg = genderBg(profile.gender);
  const accent = genderAccent(profile.gender);
  const accentLight = genderAccentLight(profile.gender);

  const handleFileUpload = useCallback((files: FileList | null, type: "top" | "bottom") => {
    if (!files) return;
    const newFiles: UploadedFile[] = Array.from(files).map((f) => ({
      id: `${type}-${Date.now()}-${Math.random()}`,
      url: URL.createObjectURL(f),
      name: f.name,
    }));
    if (type === "top") setTops((p) => [...p, ...newFiles]);
    else setBottoms((p) => [...p, ...newFiles]);
  }, []);

  const removeFile = (id: string, type: "top" | "bottom") => {
    if (type === "top") setTops((p) => p.filter((f) => f.id !== id));
    else setBottoms((p) => p.filter((f) => f.id !== id));
  };

  const canProceedUpload = tops.length >= 2 && bottoms.length >= 2;
  const canProceedContext = dayCtx.weather && dayCtx.occasion;

  const generateOutfits = () => {
    setGenerating(true);
    setPage("result");
    const today = new Date().toISOString().split("T")[0];
    const fresh = loadAnalytics();
    const combos: OutfitCombo[] = [];
    tops.forEach((top) => {
      bottoms.forEach((bottom) => {
        const useCount = getUseCount(fresh, top, bottom);
        // score penalised by use count to reduce repetition
        const base = Math.floor(Math.random() * 15) + 82;
        const penalty = Math.min(useCount * 8, 30);
        combos.push({
          top, bottom,
          score: Math.max(base - penalty, 50),
          label: OUTFIT_LABELS[Math.floor(Math.random() * OUTFIT_LABELS.length)],
          useCount,
          date: today,
        });
      });
    });
    // sort: least worn first
    combos.sort((a, b) => a.useCount - b.useCount || b.score - a.score);
    setTimeout(() => {
      setOutfits(combos);
      setGenerating(false);
      // record analytics for top 3
      combos.slice(0, 3).forEach((c) => recordOutfitUse(c.top, c.bottom));
      setAnalytics(loadAnalytics());
    }, 2600);
  };

  const topPollCombos = outfits.slice(0, 3);

  // ── NAV BAR helper ─────────────────────────────────────────────────────────
  const NavBar = ({ dark = false }: { dark?: boolean }) => (
    <div className="flex items-center gap-2 mb-6">
      <img src={logoImg} alt="StyleMatch logo" className="w-8 h-8 rounded-lg object-cover" />
      <span
        className={`text-xl tracking-tight ${dark ? "text-white" : "text-zinc-800"}`}
        style={{ fontFamily: "Playfair Display, serif" }}
      >
        StyleMatch
      </span>
    </div>
  );

  const ProgressBar = ({ step }: { step: number }) => {
    const steps = ["Profile", "Wardrobe", "Review", "Context", "Results"];
    return (
      <div className="flex gap-2 mb-10">
        {steps.map((s, i) => (
          <div key={s} className="flex-1">
            <div
              className="h-0.5 rounded-full mb-1 transition-all"
              style={{ background: i <= step ? accent : "#e5e7eb" }}
            />
            <span className="text-xs" style={{ color: i <= step ? accent : "#9ca3af", fontWeight: i === step ? 600 : 400 }}>
              {s}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // ── AUTH PAGE ───────────────────────────────────────────────────────────────
  if (page === "auth") {
    return (
      <div className="h-full bg-[#0f0f0f] flex">
        {/* Left decorative panel */}
        <div
          className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col items-center justify-center"
          style={{ background: "linear-gradient(135deg, #1a0a14 0%, #2d1420 40%, #1a0a14 100%)" }}
        >
          <div className="absolute inset-0 opacity-10">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute border border-rose-300 rounded-full"
                style={{
                  width: `${(i + 1) * 130}px`, height: `${(i + 1) * 130}px`,
                  top: "50%", left: "50%",
                  transform: "translate(-50%, -50%)", opacity: 1 - i * 0.14,
                }}
              />
            ))}
          </div>
          <div className="relative z-10 text-center px-12">
            <img src={logoImg} alt="StyleMatch" className="w-24 h-24 rounded-2xl object-cover mx-auto mb-6 shadow-2xl" />
            <h1 className="text-5xl text-white mb-4 leading-tight" style={{ fontFamily: "Playfair Display, serif" }}>
              Your wardrobe,<br /><em className="text-rose-300">curated.</em>
            </h1>
            <p className="text-rose-200/60 text-lg font-light tracking-wide">
              AI-powered outfit matching for every occasion
            </p>
          </div>
        </div>

        {/* Right auth panel */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
          <div className="mb-10 text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <img src={logoImg} alt="StyleMatch" className="w-10 h-10 rounded-xl object-cover" />
              <span className="text-white text-3xl tracking-tight" style={{ fontFamily: "Playfair Display, serif" }}>
                StyleMatch
              </span>
            </div>
            <p className="text-zinc-500 text-sm tracking-widest uppercase">Dress Intelligence</p>
          </div>

          <div className="flex bg-zinc-900 rounded-full p-1 mb-8 border border-zinc-800">
            {(["signin", "signup"] as AuthMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setAuthMode(mode)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  authMode === mode
                    ? "bg-rose-300/20 text-rose-200 border border-rose-300/30"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {mode === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <div className="w-full max-w-sm space-y-4">
            <div>
              <label className="block text-zinc-400 text-xs tracking-widest uppercase mb-2">Username</label>
              <input
                type="text" value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your.name"
                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-rose-300/50 placeholder-zinc-700 transition-colors"
              />
            </div>
            <div>
              <label className="block text-zinc-400 text-xs tracking-widest uppercase mb-2">Password</label>
              <input
                type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-rose-300/50 placeholder-zinc-700 transition-colors"
              />
            </div>
            <button
              onClick={() => setPage("profile")}
              disabled={!username || !password}
              className="w-full mt-2 py-3 rounded-xl text-sm font-medium tracking-wide transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: username && password ? "linear-gradient(135deg, #d4a5a5, #c17f7f)" : "#3f3f3f",
                color: username && password ? "#1a0a14" : "#888",
              }}
            >
              {authMode === "signin" ? "Sign In" : "Create Account"} →
            </button>
            <p className="text-center text-zinc-600 text-xs pt-2">
              {authMode === "signin" ? "New here? " : "Already have an account? "}
              <button
                onClick={() => setAuthMode(authMode === "signin" ? "signup" : "signin")}
                className="text-rose-300/80 hover:text-rose-300 transition-colors underline underline-offset-2"
              >
                {authMode === "signin" ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── PROFILE PAGE ────────────────────────────────────────────────────────────
  if (page === "profile") {
    const canProceed = profile.name && profile.age && profile.favoriteColor && profile.gender && profile.profession;
    return (
      <div className="h-full overflow-auto transition-all duration-500" style={{ background: bg }}>
        <div className="max-w-lg mx-auto px-6 py-12">
          <NavBar />
          <h2 className="text-4xl text-zinc-900 leading-tight mb-2" style={{ fontFamily: "Playfair Display, serif" }}>
            Tell us about<br />
            <em style={{ color: accent }}>yourself</em>
          </h2>
          <p className="text-zinc-500 text-sm mb-8">We'll use this to personalise your outfit suggestions.</p>
          <ProgressBar step={0} />

          <div className="space-y-5">
            <Field label="Full Name" value={profile.name} onChange={(v) => setProfile({ ...profile, name: v })} placeholder="Aanya Sharma" />
            <Field label="Age" value={profile.age} onChange={(v) => setProfile({ ...profile, age: v })} placeholder="24" type="number" />

            <div>
              <label className="block text-xs font-medium text-zinc-500 tracking-widest uppercase mb-2">Favourite Colour</label>
              <div className="flex gap-3 items-center">
                <input
                  type="color"
                  value={profile.favoriteColor || "#d4a5a5"}
                  onChange={(e) => setProfile({ ...profile, favoriteColor: e.target.value })}
                  className="w-12 h-12 rounded-xl border-0 cursor-pointer bg-transparent"
                />
                <input
                  type="text" value={profile.favoriteColor}
                  onChange={(e) => setProfile({ ...profile, favoriteColor: e.target.value })}
                  placeholder="#d4a5a5"
                  className="flex-1 bg-white border border-zinc-200 text-zinc-900 rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors"
                  style={{ outlineColor: accent }}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-500 tracking-widest uppercase mb-2">Gender</label>
              <div className="grid grid-cols-3 gap-2">
                {["Female", "Male", "Non-binary"].map((g) => (
                  <button
                    key={g}
                    onClick={() => setProfile({ ...profile, gender: g })}
                    className="py-2.5 rounded-xl text-sm font-medium border transition-all"
                    style={{
                      background: profile.gender === g ? `${accent}15` : "white",
                      borderColor: profile.gender === g ? accent : "#e5e7eb",
                      color: profile.gender === g ? accent : "#6b7280",
                    }}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <label className="block text-xs font-medium text-zinc-500 tracking-widest uppercase mb-2">Profession</label>
              <button
                onClick={() => setShowProfessionMenu(!showProfessionMenu)}
                className="w-full bg-white border text-left rounded-xl px-4 py-3 text-sm flex items-center justify-between transition-all"
                style={{ borderColor: showProfessionMenu ? accent : "#e5e7eb" }}
              >
                <span className={profile.profession ? "text-zinc-900" : "text-zinc-400"}>
                  {profile.profession ? PROFESSION_LABELS[profile.profession] : "Select your profession"}
                </span>
                <span className={`text-zinc-400 transition-transform ${showProfessionMenu ? "rotate-180" : ""}`}>▾</span>
              </button>
              {showProfessionMenu && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden z-20">
                  {(["business", "student", "working_professional"] as Profession[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => { setProfile({ ...profile, profession: p }); setShowProfessionMenu(false); }}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-zinc-50 transition-colors"
                      style={{ color: profile.profession === p ? accent : "#374151", fontWeight: profile.profession === p ? 600 : 400 }}
                    >
                      {PROFESSION_LABELS[p]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setPage("upload")}
            disabled={!canProceed}
            className="w-full mt-8 py-4 rounded-xl text-sm font-semibold tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed text-white"
            style={{ background: canProceed ? `linear-gradient(135deg, ${accentLight}, ${accent})` : "#e5e7eb", color: canProceed ? "white" : "#9ca3af" }}
          >
            Continue to Wardrobe Upload →
          </button>
        </div>
      </div>
    );
  }

  // ── UPLOAD PAGE ─────────────────────────────────────────────────────────────
  if (page === "upload") {
    return (
      <div className="h-full overflow-auto transition-all duration-500" style={{ background: bg }}>
        <div className="max-w-2xl mx-auto px-6 py-12">
          <NavBar />
          <h2 className="text-4xl text-zinc-900 leading-tight mb-2" style={{ fontFamily: "Playfair Display, serif" }}>
            Upload your<br /><em style={{ color: accent }}>wardrobe</em>
          </h2>
          <p className="text-zinc-500 text-sm mb-8">Add at least 2 tops and 2 bottoms to generate outfit combinations.</p>
          <ProgressBar step={1} />

          <div className="space-y-6">
            <UploadSection
              title="Tops" subtitle="Shirts, blouses, t-shirts, kurtas…"
              files={tops} onUpload={(f) => handleFileUpload(f, "top")}
              onRemove={(id) => removeFile(id, "top")} inputRef={topInputRef}
              required={2} accent={accent} accentLight={accentLight}
            />
            <UploadSection
              title="Bottoms" subtitle="Pants, jeans, skirts, lowers…"
              files={bottoms} onUpload={(f) => handleFileUpload(f, "bottom")}
              onRemove={(id) => removeFile(id, "bottom")} inputRef={bottomInputRef}
              required={2} accent={accent} accentLight={accentLight}
            />
          </div>

          <div className="mt-8 flex items-center justify-between">
            <button onClick={() => setPage("profile")} className="text-zinc-400 hover:text-zinc-600 text-sm transition-colors">← Back</button>
            <button
              onClick={() => setPage("review")}
              disabled={!canProceedUpload}
              className="px-8 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed text-white"
              style={{ background: canProceedUpload ? `linear-gradient(135deg, ${accentLight}, ${accent})` : "#e5e7eb", color: canProceedUpload ? "white" : "#9ca3af" }}
            >
              Review Wardrobe →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── REVIEW PAGE ─────────────────────────────────────────────────────────────
  if (page === "review") {
    return (
      <div className="h-full overflow-auto transition-all duration-500" style={{ background: bg }}>
        <div className="max-w-2xl mx-auto px-6 py-12">
          <NavBar />
          <h2 className="text-4xl text-zinc-900 leading-tight mb-2" style={{ fontFamily: "Playfair Display, serif" }}>
            Review your<br /><em style={{ color: accent }}>collection</em>
          </h2>
          <p className="text-zinc-500 text-sm mb-8">Confirm your wardrobe before we generate outfit suggestions.</p>
          <ProgressBar step={2} />

          <div className="space-y-8">
            <div>
              <h3 className="text-lg text-zinc-700 mb-4" style={{ fontFamily: "Playfair Display, serif" }}>
                Tops ({tops.length})
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {tops.map((f) => <ReviewThumb key={f.id} file={f} analytics={analytics} type="top" />)}
              </div>
            </div>
            <div className="border-t border-white/60 pt-8">
              <h3 className="text-lg text-zinc-700 mb-4" style={{ fontFamily: "Playfair Display, serif" }}>
                Bottoms ({bottoms.length})
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {bottoms.map((f) => <ReviewThumb key={f.id} file={f} analytics={analytics} type="bottom" />)}
              </div>
            </div>
          </div>

          {/* Analytics preview */}
          {analytics.length > 0 && (
            <div className="mt-6 p-4 bg-white/70 rounded-2xl border border-white">
              <p className="text-xs font-semibold text-zinc-500 tracking-widest uppercase mb-3">Wear History</p>
              <div className="space-y-2">
                {analytics.slice(0, 3).map((r) => (
                  <div key={r.key} className="flex items-center justify-between text-xs text-zinc-600">
                    <span className="truncate max-w-[70%]">{r.topName} + {r.bottomName}</span>
                    <span className="font-semibold ml-2" style={{ color: accent }}>×{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 p-5 bg-white rounded-2xl border border-zinc-200 flex items-center justify-between">
            <div>
              <p className="text-zinc-900 font-medium text-sm">{tops.length * bottoms.length} outfit combinations possible</p>
              <p className="text-zinc-400 text-xs mt-0.5">from {tops.length} tops × {bottoms.length} bottoms</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPage("upload")} className="px-4 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 text-sm hover:bg-zinc-50 transition-colors">
                Edit
              </button>
              <button
                onClick={() => setPage("context")}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: `linear-gradient(135deg, ${accentLight}, ${accent})` }}
              >
                OK →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── CONTEXT PAGE (weather + occasion) ────────────────────────────────────────
  if (page === "context") {
    return (
      <div className="h-full overflow-auto transition-all duration-500" style={{ background: bg }}>
        <div className="max-w-lg mx-auto px-6 py-12">
          <NavBar />
          <h2 className="text-4xl text-zinc-900 leading-tight mb-2" style={{ fontFamily: "Playfair Display, serif" }}>
            What's today<br /><em style={{ color: accent }}>like?</em>
          </h2>
          <p className="text-zinc-500 text-sm mb-8">
            Tell us about the weather and your occasion so we can pick the perfect outfit.
          </p>
          <ProgressBar step={3} />

          {/* Weather */}
          <div className="mb-8">
            <label className="block text-xs font-semibold text-zinc-500 tracking-widest uppercase mb-4">
              Today's Weather
            </label>
            <div className="grid grid-cols-3 gap-3">
              {WEATHER_OPTIONS.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setDayCtx({ ...dayCtx, weather: w.id })}
                  className="flex flex-col items-center gap-2 py-4 rounded-2xl border-2 transition-all"
                  style={{
                    background: dayCtx.weather === w.id ? `${accent}12` : "white",
                    borderColor: dayCtx.weather === w.id ? accent : "#e5e7eb",
                  }}
                >
                  <span className="text-2xl">{w.icon}</span>
                  <span className="text-xs font-medium" style={{ color: dayCtx.weather === w.id ? accent : "#6b7280" }}>
                    {w.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Occasion */}
          <div className="mb-8">
            <label className="block text-xs font-semibold text-zinc-500 tracking-widest uppercase mb-4">
              Today's Occasion
            </label>
            <div className="grid grid-cols-2 gap-3">
              {OCCASION_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setDayCtx({ ...dayCtx, occasion: o.id })}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all"
                  style={{
                    background: dayCtx.occasion === o.id ? `${accent}12` : "white",
                    borderColor: dayCtx.occasion === o.id ? accent : "#e5e7eb",
                  }}
                >
                  <span className="text-xl">{o.icon}</span>
                  <span className="text-sm font-medium" style={{ color: dayCtx.occasion === o.id ? accent : "#374151" }}>
                    {o.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setPage("review")} className="text-zinc-400 hover:text-zinc-600 text-sm transition-colors px-4 py-3">
              ← Back
            </button>
            <button
              onClick={generateOutfits}
              disabled={!canProceedContext}
              className="flex-1 py-4 rounded-xl text-sm font-semibold tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed text-white"
              style={{ background: canProceedContext ? `linear-gradient(135deg, ${accentLight}, ${accent})` : "#e5e7eb", color: canProceedContext ? "white" : "#9ca3af" }}
            >
              Generate My Outfits ✦
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── POLL PAGE ────────────────────────────────────────────────────────────────
  if (page === "poll") {
    const totalVotes = Object.values(pollVotes).reduce((a, b) => a + b, 0);
    return (
      <div className="h-full bg-[#0f0f0f] overflow-auto">
        <div className="max-w-lg mx-auto px-6 py-12">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-2">
              <img src={logoImg} alt="StyleMatch" className="w-7 h-7 rounded-lg object-cover" />
              <span className="text-white text-xl tracking-tight" style={{ fontFamily: "Playfair Display, serif" }}>StyleMatch</span>
            </div>
            <button onClick={() => setPage("result")} className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">← Results</button>
          </div>

          <h2 className="text-4xl text-white leading-tight mb-2" style={{ fontFamily: "Playfair Display, serif" }}>
            Ask your<br /><em className="text-rose-300">friends</em>
          </h2>
          <p className="text-zinc-500 text-sm mb-8">Share your top 3 outfits and let friends vote on what you should wear.</p>

          {/* Outfit options */}
          <div className="space-y-3 mb-8">
            {topPollCombos.map((combo, i) => {
              const votes = pollVotes[i] ?? 0;
              const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
              return (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="flex">
                    <div className="w-14 h-14 flex-shrink-0 border-r border-zinc-800">
                      <img src={combo.top.url} alt="top" className="w-full h-full object-cover" />
                    </div>
                    <div className="w-14 h-14 flex-shrink-0 border-r border-zinc-800">
                      <img src={combo.bottom.url} alt="bottom" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 px-4 py-2 flex items-center justify-between">
                      <div>
                        <span className="text-zinc-300 text-xs font-semibold">Option {String.fromCharCode(65 + i)}</span>
                        <p className="text-zinc-500 text-xs mt-0.5">{combo.label}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-white text-sm font-bold">{pct}%</span>
                          <p className="text-zinc-600 text-xs">{votes} votes</p>
                        </div>
                        <button
                          onClick={() => setPollVotes((prev) => ({ ...prev, [i]: (prev[i] ?? 0) + 1 }))}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                          style={{ background: `linear-gradient(135deg, ${accentLight}, ${accent})` }}
                        >
                          Vote
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* vote bar */}
                  {totalVotes > 0 && (
                    <div className="h-1 bg-zinc-800">
                      <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${accentLight}, ${accent})` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Send to friend */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p className="text-zinc-300 text-sm font-semibold mb-3">Send poll to a friend</p>
            {pollSent ? (
              <div className="flex items-center gap-3 text-green-400 text-sm">
                <span className="text-xl">✅</span>
                Poll sent to {friendName}! Waiting for votes…
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={friendName}
                  onChange={(e) => setFriendName(e.target.value)}
                  placeholder="Friend's name or @handle"
                  className="flex-1 bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-rose-300/50 placeholder-zinc-600 transition-colors"
                />
                <button
                  onClick={() => { if (friendName) setPollSent(true); }}
                  disabled={!friendName}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all"
                  style={{ background: `linear-gradient(135deg, ${accentLight}, ${accent})` }}
                >
                  Send
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 text-center">
            <p className="text-zinc-600 text-xs">Total votes: {totalVotes}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── RESULT PAGE ─────────────────────────────────────────────────────────────
  const weatherLabel = WEATHER_OPTIONS.find((w) => w.id === dayCtx.weather);
  const occasionLabel = OCCASION_OPTIONS.find((o) => o.id === dayCtx.occasion);
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="h-full bg-[#0f0f0f] overflow-auto">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="StyleMatch" className="w-7 h-7 rounded-lg object-cover" />
            <span className="text-white text-xl tracking-tight" style={{ fontFamily: "Playfair Display, serif" }}>StyleMatch</span>
          </div>
          <button
            onClick={() => { setPage("auth"); setTops([]); setBottoms([]); setOutfits([]); setGenerating(false); setPollVotes({}); setPollSent(false); }}
            className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
          >
            Start over
          </button>
        </div>

        {generating ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="relative mb-8 w-20 h-20">
              <div className="absolute inset-0 border-2 border-rose-300/20 rounded-full" />
              <div className="absolute inset-0 border-t-2 border-rose-300 rounded-full animate-spin" />
              <div className="absolute inset-3 border-b-2 border-rose-200/40 rounded-full animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
              <span className="absolute inset-0 flex items-center justify-center text-rose-300 text-xl">✦</span>
            </div>
            <h3 className="text-white text-2xl mb-2" style={{ fontFamily: "Playfair Display, serif" }}>Curating your outfits…</h3>
            <p className="text-zinc-500 text-sm">Analysing weather, occasion, and your wardrobe history</p>
          </div>
        ) : (
          <>
            {/* Day header */}
            <div className="mb-6 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-start justify-between flex-wrap gap-4">
              <div>
                <p className="text-zinc-500 text-xs tracking-widest uppercase mb-1">Today's Picks</p>
                <h2 className="text-2xl text-white" style={{ fontFamily: "Playfair Display, serif" }}>{today}</h2>
                <div className="flex items-center gap-4 mt-2">
                  {weatherLabel && (
                    <span className="flex items-center gap-1.5 text-zinc-400 text-sm">
                      <span>{weatherLabel.icon}</span> {weatherLabel.label}
                    </span>
                  )}
                  {occasionLabel && (
                    <span className="flex items-center gap-1.5 text-zinc-400 text-sm">
                      <span>{occasionLabel.icon}</span> {occasionLabel.label}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-zinc-500 text-xs">For {profile.name}</p>
                <p className="text-zinc-400 text-xs mt-0.5">{PROFESSION_LABELS[profile.profession] || ""}</p>
                <p className="text-xs mt-1" style={{ color: accent }}>{outfits.length} combinations</p>
              </div>
            </div>

            {/* Top pick badge */}
            {outfits.length > 0 && (
              <div className="mb-4 flex items-center gap-2">
                <span className="text-xs px-3 py-1 rounded-full font-semibold text-white" style={{ background: accent }}>
                  ✦ Top Pick — least worn
                </span>
                <span className="text-zinc-600 text-xs">Sorted to minimise repetition</span>
              </div>
            )}

            <div className="space-y-3">
              {outfits.map((combo, i) => (
                <OutfitCard key={i} combo={combo} index={i} accent={accent} accentLight={accentLight} />
              ))}
            </div>

            <div className="mt-10 flex flex-col sm:flex-row items-center gap-3 justify-center">
              <button
                onClick={() => { setPage("poll"); setPollVotes({}); setPollSent(false); }}
                className="px-8 py-3 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: `linear-gradient(135deg, ${accentLight}, ${accent})` }}
              >
                🗳️ Ask Friends to Vote
              </button>
              <button
                onClick={() => { setPage("context"); setOutfits([]); }}
                className="px-8 py-3 rounded-xl border border-zinc-700 text-zinc-400 text-sm hover:border-zinc-500 hover:text-zinc-200 transition-all"
              >
                Change occasion
              </button>
            </div>

            {/* Analytics summary */}
            {analytics.length > 0 && (
              <div className="mt-8 p-5 bg-zinc-900 border border-zinc-800 rounded-2xl">
                <p className="text-zinc-400 text-xs tracking-widest uppercase mb-3 font-semibold">Wear Analytics</p>
                <div className="space-y-2">
                  {analytics.slice(0, 5).map((r) => (
                    <div key={r.key} className="flex items-center justify-between">
                      <span className="text-zinc-500 text-xs truncate max-w-[75%]">{r.topName} + {r.bottomName}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.min((r.count / Math.max(...analytics.map((x) => x.count))) * 100, 100)}%`, background: accent }}
                          />
                        </div>
                        <span className="text-xs font-bold" style={{ color: accent }}>×{r.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── SUB-COMPONENTS ────────────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-500 tracking-widest uppercase mb-2">{label}</label>
      <input
        type={type} value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white border border-zinc-200 text-zinc-900 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-rose-300 placeholder-zinc-300 transition-colors"
      />
    </div>
  );
}

function UploadSection({ title, subtitle, files, onUpload, onRemove, inputRef, required, accent, accentLight }: {
  title: string; subtitle: string; files: UploadedFile[];
  onUpload: (f: FileList | null) => void; onRemove: (id: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  required: number; accent: string; accentLight: string;
}) {
  const met = files.length >= required;
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-zinc-900" style={{ fontFamily: "Playfair Display, serif" }}>{title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${met ? "bg-green-50 text-green-500" : "bg-amber-50 text-amber-500"}`}>
              {files.length}/{required} min
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-all"
          style={{ background: `${accent}12`, color: accent, borderColor: `${accent}40` }}
        >
          + Add
        </button>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onUpload(e.target.files)} />
      </div>
      <div className="p-4">
        {files.length === 0 ? (
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full border-2 border-dashed border-zinc-200 rounded-xl py-10 text-center hover:border-zinc-300 transition-colors"
          >
            <div className="text-2xl mb-2 text-zinc-300">📷</div>
            <p className="text-zinc-400 text-sm">Click to upload images</p>
            <p className="text-zinc-300 text-xs mt-1">PNG, JPG, WEBP supported</p>
          </button>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {files.map((f) => (
              <div key={f.id} className="relative group">
                <img src={f.url} alt={f.name} className="w-full aspect-square object-cover rounded-xl" />
                <button
                  onClick={() => onRemove(f.id)}
                  className="absolute top-1.5 right-1.5 w-5 h-5 bg-black/60 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >×</button>
              </div>
            ))}
            <button
              onClick={() => inputRef.current?.click()}
              className="aspect-square border-2 border-dashed border-zinc-200 rounded-xl flex items-center justify-center text-zinc-400 hover:border-zinc-300 text-xl transition-colors"
            >+</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewThumb({ file, analytics, type }: { file: UploadedFile; analytics: AnalyticsRecord[]; type: "top" | "bottom" }) {
  const uses = analytics.filter((r) => type === "top" ? r.topName === file.name : r.bottomName === file.name)
    .reduce((s, r) => s + r.count, 0);
  return (
    <div className="relative">
      <img src={file.url} alt={file.name} className="w-full aspect-square object-cover rounded-xl" />
      {uses > 0 && (
        <span className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded-md">×{uses}</span>
      )}
    </div>
  );
}

function OutfitCard({ combo, index, accent, accentLight }: { combo: OutfitCombo; index: number; accent: string; accentLight: string }) {
  const [liked, setLiked] = useState(false);
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex hover:border-zinc-700 transition-all">
      <div className="w-24 h-24 flex-shrink-0 border-r border-zinc-800">
        <img src={combo.top.url} alt="top" className="w-full h-full object-cover" />
      </div>
      <div className="w-24 h-24 flex-shrink-0 border-r border-zinc-800">
        <img src={combo.bottom.url} alt="bottom" className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 px-4 py-3 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs tracking-widest uppercase font-medium" style={{ color: accentLight }}>{combo.label}</span>
            <div className="flex items-center gap-2">
              {combo.useCount > 0 && (
                <span className="text-zinc-600 text-xs bg-zinc-800 px-1.5 py-0.5 rounded">worn ×{combo.useCount}</span>
              )}
              <span className="text-zinc-600 text-xs">#{index + 1}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${combo.score}%`, background: `linear-gradient(90deg, ${accentLight}, ${accent})` }} />
            </div>
            <span className="text-xs font-semibold" style={{ color: accentLight }}>{combo.score}%</span>
          </div>
          <p className="text-zinc-600 text-xs mt-1">Match score</p>
        </div>
        <button
          onClick={() => setLiked(!liked)}
          className={`self-end text-lg transition-all ${liked ? "scale-110" : "text-zinc-700 hover:text-zinc-500"}`}
          style={{ color: liked ? accent : undefined }}
        >
          {liked ? "♥" : "♡"}
        </button>
      </div>
    </div>
  );
}
