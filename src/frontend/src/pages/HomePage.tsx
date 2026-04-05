import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bookmark,
  ChevronRight,
  Cloud,
  Menu,
  Search,
  Share2,
  Sun,
  TrendingUp,
  User,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useGetCallerRole } from "../hooks/useQueries";
import { sanitizeText, validateSearchQuery } from "../utils/security";

// ── Types ────────────────────────────────────────────────────────────────────

interface WeatherData {
  city: string;
  temp: number;
  weatherCode: number;
}

type WeatherState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: WeatherData }
  | { status: "error"; message: string };

// ── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_CHIPS = [
  { label: "Shopping", emoji: "🛍️" },
  { label: "Education", emoji: "📚" },
  { label: "News", emoji: "📰" },
  { label: "Tools", emoji: "🔧" },
] as const;

const TRENDING_ITEMS = [
  "AI tools 2026",
  "Best privacy browsers",
  "Free design resources",
  "How to build a website",
  "Open source software",
] as const;

function getWeatherEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 3) return "🌤️";
  if (code <= 48) return "🌫️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌦️";
  if (code <= 99) return "⛈️";
  return "🌡️";
}

function getWeatherLabel(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 67) return "Rainy";
  if (code <= 77) return "Snowy";
  if (code <= 82) return "Showers";
  if (code <= 99) return "Thunderstorm";
  return "Unknown";
}

// ── WeatherCard component ─────────────────────────────────────────────────────

function WeatherCard() {
  const [weather, setWeather] = useState<WeatherState>({ status: "idle" });

  useEffect(() => {
    if (!navigator.geolocation) {
      setWeather({ status: "error", message: "Geolocation not supported" });
      return;
    }
    setWeather({ status: "loading" });
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lon } = position.coords;
        try {
          const [weatherRes, geoRes] = await Promise.all([
            fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode&timezone=auto`,
            ),
            fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
            ),
          ]);
          const [weatherJson, geoJson] = await Promise.all([
            weatherRes.json() as Promise<{
              current: { temperature_2m: number; weathercode: number };
            }>,
            geoRes.json() as Promise<{
              address?: {
                city?: string;
                town?: string;
                village?: string;
                county?: string;
              };
            }>,
          ]);

          const city =
            geoJson.address?.city ||
            geoJson.address?.town ||
            geoJson.address?.village ||
            geoJson.address?.county ||
            "Your location";

          setWeather({
            status: "success",
            data: {
              city,
              temp: Math.round(weatherJson.current.temperature_2m),
              weatherCode: weatherJson.current.weathercode,
            },
          });
        } catch {
          setWeather({ status: "error", message: "Could not load weather" });
        }
      },
      () => {
        setWeather({ status: "error", message: "Location access denied" });
      },
    );
  }, []);

  return (
    <div
      className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-4"
      data-ocid="discover.weather.card"
    >
      {/* Card header */}
      <div className="flex items-center gap-2 mb-3">
        <Sun className="h-4 w-4 text-[#006AFF]" />
        <span className="text-sm font-semibold text-[#111827]">Weather</span>
      </div>

      {weather.status === "idle" && (
        <button
          type="button"
          onClick={() => setWeather({ status: "loading" })}
          className="text-xs text-[#006AFF] hover:underline"
        >
          Enable location for weather
        </button>
      )}

      {weather.status === "loading" && (
        <div
          className="flex items-center gap-2 text-[#6B7280]"
          data-ocid="discover.weather.loading_state"
        >
          <Cloud className="h-4 w-4 animate-pulse" />
          <span className="text-xs">Detecting location…</span>
        </div>
      )}

      {weather.status === "error" && (
        <div data-ocid="discover.weather.error_state">
          <p className="text-sm font-medium text-[#374151]">
            Weather unavailable
          </p>
          <p className="text-xs text-[#9CA3AF] mt-0.5">{weather.message}</p>
        </div>
      )}

      {weather.status === "success" && (
        <div
          className="flex items-center justify-between"
          data-ocid="discover.weather.success_state"
        >
          <div>
            <p className="text-3xl font-bold text-[#111827]">
              {weather.data.temp}°C
            </p>
            <p className="text-sm text-[#6B7280] mt-0.5">{weather.data.city}</p>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              {getWeatherLabel(weather.data.weatherCode)}
            </p>
          </div>
          <span className="text-4xl" role="img" aria-label="weather">
            {getWeatherEmoji(weather.data.weatherCode)}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { data: role } = useGetCallerRole();
  const {
    isAuthenticated: isLocalAuth,
    role: authRole,
    user: authUser,
    logout: authLogout,
  } = useAuth();

  const isAdmin = authRole === "admin" || role === "admin";
  const isUserLoggedIn = isLocalAuth && authRole === "user";

  // Admin-configurable logo URLs from localStorage
  const headerLogoUrl =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("aflino_header_logo_url") || ""
      : "";
  const searchBarIconUrl =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("aflino_searchbar_icon_url") || ""
      : "";

  // Close profile dropdown on outside click
  useEffect(() => {
    if (!profileMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(e.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileMenuOpen]);

  const handleSearch = (q?: string) => {
    const term = (q ?? query).trim();
    if (!term) return;
    const sanitized = sanitizeText(term);
    if (validateSearchQuery(sanitized) !== null) return;
    void navigate({ to: "/search", search: { q: sanitized } });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  const closeMenu = () => setMenuOpen(false);

  const handleAdminLogout = () => {
    authLogout();
    closeMenu();
  };

  const handleUserLogout = () => {
    authLogout();
    setProfileMenuOpen(false);
    void navigate({ to: "/" });
  };

  // Get user initials for avatar
  const userInitial = authUser ? authUser.charAt(0).toUpperCase() : "U";

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ── Sticky Header ── */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-5 py-3 bg-white border-b border-[#E5E7EB]"
        data-ocid="header.section"
      >
        {/* Left: Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 no-underline"
          data-ocid="header.home.link"
        >
          {headerLogoUrl ? (
            <img
              src={headerLogoUrl}
              alt="Aflino"
              className="h-7 w-7 object-contain"
            />
          ) : (
            <img
              src="/assets/generated/aflino-logo-icon-transparent.dim_64x64.png"
              alt="Aflino"
              className="h-7 w-7 object-contain"
            />
          )}
          <span className="font-semibold text-[#111827] text-base tracking-tight">
            aflino
          </span>
        </Link>

        {/* Right: Profile icon + Hamburger */}
        <div className="flex items-center gap-2">
          {/* Profile icon — only when user is logged in */}
          {isUserLoggedIn && (
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((o) => !o)}
                className="h-8 w-8 rounded-full bg-[#006AFF] flex items-center justify-center text-white text-xs font-semibold hover:bg-[#0052CC] transition-colors"
                aria-label={`Profile menu for ${authUser}`}
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
                data-ocid="header.profile.button"
              >
                {authUser ? (
                  <span className="text-xs font-bold">{userInitial}</span>
                ) : (
                  <User className="h-4 w-4" />
                )}
              </button>

              {/* Dropdown */}
              {profileMenuOpen && (
                <div
                  className="absolute right-0 top-10 bg-white rounded-xl border border-[#E5E7EB] shadow-lg w-48 z-50 py-1"
                  role="menu"
                  data-ocid="header.profile.dropdown_menu"
                >
                  {/* User email */}
                  {authUser && (
                    <div className="px-4 py-2 border-b border-[#F3F4F6]">
                      <p className="text-xs text-[#9CA3AF] truncate">
                        {authUser}
                      </p>
                    </div>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      void navigate({ to: "/dashboard" });
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-[#374151] hover:bg-[#F9FAFB] transition-colors"
                    data-ocid="profile.dashboard.link"
                  >
                    Dashboard
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      void navigate({ to: "/submit" });
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-[#374151] hover:bg-[#F9FAFB] transition-colors"
                    data-ocid="profile.submit.link"
                  >
                    Submit Website
                  </button>
                  <div className="border-t border-[#F3F4F6] my-1" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleUserLogout}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    data-ocid="profile.logout.button"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors text-[#6B7280]"
            aria-label="Open menu"
            data-ocid="header.menu.open_modal_button"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* ── Hamburger Slide Panel ── */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={closeMenu}
          onKeyDown={(e) => e.key === "Escape" && closeMenu()}
          role="presentation"
        />
      )}
      <div
        className={`fixed top-0 right-0 h-full w-1/2 min-w-[240px] max-w-xs bg-white z-50 shadow-xl flex flex-col transition-transform duration-300 ease-in-out ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
        data-ocid="header.menu.panel"
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
          <span className="font-semibold text-[#111827] text-base">Menu</span>
          <button
            type="button"
            onClick={closeMenu}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-[#6B7280]"
            aria-label="Close menu"
            data-ocid="header.menu.close_button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Panel content */}
        <nav className="flex flex-col gap-2 p-5 flex-1">
          {/* Not logged in: show Login link */}
          {!isLocalAuth && (
            <Link
              to="/login"
              onClick={closeMenu}
              className="block px-4 py-3 rounded-xl border border-[#006AFF] text-[#006AFF] text-sm font-semibold text-center hover:bg-[#006AFF] hover:text-white transition-colors"
              data-ocid="menu.login.link"
            >
              Sign In
            </Link>
          )}

          {/* My Dashboard (for logged-in users) */}
          {isUserLoggedIn && !isAdmin && (
            <Link
              to="/dashboard"
              onClick={closeMenu}
              className="block px-4 py-3 rounded-xl border border-[#E5E7EB] text-[#374151] text-sm font-medium hover:bg-[#F9FAFB] transition-colors"
              data-ocid="menu.dashboard.link"
            >
              My Dashboard
            </Link>
          )}

          {/* Admin Panel (for local admin session) */}
          {isAdmin && (
            <Link
              to="/admin"
              onClick={closeMenu}
              className="block px-4 py-3 rounded-xl bg-[#006AFF]/10 border border-[#006AFF]/20 text-[#006AFF] text-sm font-semibold hover:bg-[#006AFF]/20 transition-colors"
              data-ocid="menu.local_admin_panel.link"
            >
              🔐 Admin Panel
            </Link>
          )}

          {/* Submit Website — primary CTA */}
          <Link
            to="/submit"
            onClick={closeMenu}
            className="block px-4 py-3 rounded-xl bg-[#006AFF] text-white text-sm font-semibold text-center hover:bg-[#0052CC] transition-colors"
            data-ocid="menu.submit.button"
          >
            Submit Website
          </Link>

          {/* Divider */}
          <div className="border-t border-[#E5E7EB] my-1" />

          {/* Admin Sign Out */}
          {isAdmin && (
            <button
              type="button"
              onClick={handleAdminLogout}
              className="px-4 py-2 text-sm text-[#9CA3AF] hover:text-red-500 transition-colors text-left"
              data-ocid="menu.admin_logout.button"
            >
              Admin Sign Out
            </button>
          )}

          {/* Internet Identity Sign Out (non-admin ICP users) */}
        </nav>
      </div>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col items-center px-4 pt-10 pb-16">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center w-full max-w-xl"
        >
          {/* ── Pill Search Bar ── */}
          <div
            className={`relative flex items-center w-full bg-white rounded-full border transition-all ${
              focused
                ? "border-[#006AFF] shadow-[0_0_0_3px_rgba(0,106,255,0.12)]"
                : "border-[#E5E7EB] shadow-[0_1px_6px_rgba(0,0,0,0.07)]"
            }`}
            style={{ height: "52px" }}
          >
            {/* Left icon */}
            <div className="pl-3 flex-shrink-0">
              {searchBarIconUrl ? (
                <img
                  src={searchBarIconUrl}
                  alt=""
                  className="h-6 w-6 object-contain flex-shrink-0"
                />
              ) : (
                <img
                  src="/assets/generated/aflino-logo-icon-transparent.dim_64x64.png"
                  alt=""
                  className="h-6 w-6 object-contain flex-shrink-0"
                />
              )}
            </div>

            {/* Text input */}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Aflino Search..."
              className="flex-1 px-3 bg-transparent outline-none text-[#111827] placeholder:text-[#9CA3AF] text-base h-full"
              data-ocid="home.search.input"
            />

            {/* Circular search button */}
            <button
              type="button"
              onClick={() => handleSearch()}
              className="flex items-center justify-center h-9 w-9 rounded-full bg-[#006AFF] hover:bg-[#0052CC] text-white transition-colors flex-shrink-0 mr-1.5"
              aria-label="Search"
              data-ocid="home.search.button"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>

          {/* Trust line */}
          <p className="text-xs text-[#6B7280] mt-2 mb-6 text-center">
            ✔ Verified Websites Only &bull; 🔒 Safe &amp; Secure Search
          </p>

          {/* ── Discover Section ── */}
          <div className="w-full">
            <h2 className="font-semibold text-base text-[#111827] mb-4">
              Discover
            </h2>

            <div
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
              data-ocid="discover.section"
            >
              {/* A. Category Card (full width on sm+) */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-4 sm:col-span-2"
                data-ocid="discover.categories.card"
              >
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">
                  Browse by Category
                </p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_CHIPS.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => handleSearch(chip.label)}
                      className="px-4 py-1.5 rounded-full border border-[#E5E7EB] bg-white text-sm text-[#374151] hover:bg-[#006AFF] hover:text-white hover:border-[#006AFF] transition-colors cursor-pointer font-medium"
                      data-ocid={`discover.${chip.label.toLowerCase()}.button`}
                    >
                      {chip.emoji} {chip.label}
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* B. Trending Card */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-4"
                data-ocid="discover.trending.card"
              >
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-[#006AFF]" />
                  <span className="text-sm font-semibold text-[#111827]">
                    Trending Searches
                  </span>
                </div>
                <ul className="space-y-0">
                  {TRENDING_ITEMS.map((item, i) => (
                    <li key={item}>
                      <button
                        type="button"
                        onClick={() => handleSearch(item)}
                        className="flex items-center justify-between w-full py-2 border-b border-[#F3F4F6] last:border-0 cursor-pointer hover:bg-[#F9FAFB] rounded-lg px-2 -mx-2 transition-colors group"
                        data-ocid={`discover.trending.item.${i + 1}`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="text-sm"
                            role="img"
                            aria-label="trending"
                          >
                            🔥
                          </span>
                          <span className="text-sm text-[#374151] text-left">
                            {item}
                          </span>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-[#9CA3AF] group-hover:text-[#006AFF] transition-colors flex-shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              </motion.div>

              {/* C. Weather Card */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <WeatherCard />
              </motion.div>

              {/* D. Featured Content Card */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-4 sm:col-span-2"
                data-ocid="discover.featured.card"
              >
                <p className="text-[10px] font-semibold text-[#006AFF] uppercase tracking-widest mb-2">
                  Suggested for you
                </p>
                <img
                  src="/assets/generated/featured-article-hero.dim_600x300.jpg"
                  alt="The Future of Search"
                  className="w-full h-32 object-cover rounded-xl mb-3"
                />
                <span className="text-xs text-[#9CA3AF]">
                  TechCrunch &bull; 1h ago
                </span>
                <p className="text-sm font-semibold text-[#111827] mt-1 mb-3 leading-snug">
                  The Future of Search: How AI Is Reshaping the Internet
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex-1 flex items-center justify-center gap-1 text-xs text-[#6B7280] border border-[#E5E7EB] rounded-lg py-1.5 hover:border-[#006AFF] hover:text-[#006AFF] transition-colors"
                    data-ocid="discover.featured.save.button"
                  >
                    <Bookmark className="h-3 w-3" />
                    Save
                  </button>
                  <button
                    type="button"
                    className="flex-1 flex items-center justify-center gap-1 text-xs text-[#6B7280] border border-[#E5E7EB] rounded-lg py-1.5 hover:border-[#006AFF] hover:text-[#006AFF] transition-colors"
                    data-ocid="discover.featured.share.button"
                    onClick={() => {
                      if (navigator.share) {
                        void navigator.share({
                          title:
                            "The Future of Search: How AI Is Reshaping the Internet",
                          url: window.location.href,
                        });
                      } else {
                        void navigator.clipboard.writeText(
                          window.location.href,
                        );
                      }
                    }}
                  >
                    <Share2 className="h-3 w-3" />
                    Share
                  </button>
                  <button
                    type="button"
                    className="flex-1 flex items-center justify-center gap-1 text-xs text-[#6B7280] border border-[#E5E7EB] rounded-lg py-1.5 hover:border-[#006AFF] hover:text-[#006AFF] transition-colors"
                    data-ocid="discover.featured.read.button"
                  >
                    <Search className="h-3 w-3" />
                    Read
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* ── Footer ── */}
      <footer className="py-4 px-6 border-t border-[#E5E7EB]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#9CA3AF]">
          <nav className="flex items-center gap-4">
            <Link to="/" className="hover:text-[#6B7280] transition-colors">
              About
            </Link>
            <Link to="/" className="hover:text-[#6B7280] transition-colors">
              Privacy
            </Link>
            <Link to="/" className="hover:text-[#6B7280] transition-colors">
              Terms
            </Link>
          </nav>
          <p>
            © {new Date().getFullYear()}. Built with{" "}
            <span className="text-red-400">♥</span> using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#6B7280] transition-colors underline"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
