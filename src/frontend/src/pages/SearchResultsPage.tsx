import { Link, useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Search,
  User,
} from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import type { Website } from "../backend.d";
import { useAuth } from "../context/AuthContext";
import { useRecordClick, useSearchWebsites } from "../hooks/useQueries";

// ── Constants ────────────────────────────────────────────────────────────────

const RESULTS_PER_PAGE = 10;
const SKELETON_KEYS = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5"];

// ── Keyword highlight utility ─────────────────────────────────────────────────────

interface TextSegment {
  text: string;
  highlight: boolean;
  key: string;
}

function buildSegments(text: string, query: string): TextSegment[] {
  if (!query.trim()) return [{ text, highlight: false, key: "all" }];
  const words = query
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  if (words.length === 0) return [{ text, highlight: false, key: "all" }];

  const pattern = words
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const regex = new RegExp(`(${pattern})`, "gi");
  const parts = text.split(regex);

  const segments: TextSegment[] = [];
  let offset = 0;
  for (const part of parts) {
    segments.push({
      text: part,
      highlight: regex.test(part),
      key: `seg-${offset}-${part.length}`,
    });
    offset += part.length;
    // Reset lastIndex since we're using the regex in a loop
    regex.lastIndex = 0;
  }
  return segments;
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const segments = buildSegments(text, query);
  return (
    <>
      {segments.map((seg) =>
        seg.highlight ? (
          <mark
            key={seg.key}
            className="bg-yellow-100 text-inherit rounded-sm px-0.5"
          >
            {seg.text}
          </mark>
        ) : (
          <span key={seg.key}>{seg.text}</span>
        ),
      )}
    </>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────────

function ResultSkeleton() {
  return (
    <div className="mb-6 pb-6 border-b border-[#F3F4F6] animate-pulse">
      <div className="h-3 w-40 bg-gray-200 rounded mb-2" />
      <div className="h-5 w-3/4 bg-gray-200 rounded mb-2" />
      <div className="h-3.5 w-full bg-gray-200 rounded mb-1.5" />
      <div className="h-3.5 w-5/6 bg-gray-200 rounded" />
    </div>
  );
}

// ── Single result item ────────────────────────────────────────────────────────────

function ResultItem({
  website,
  query,
  index,
  onClickTrack,
}: {
  website: Website;
  query: string;
  index: number;
  onClickTrack: (url: string) => void;
}) {
  const displayUrl = website.url
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");

  return (
    <div
      className="mb-6 pb-6 border-b border-[#F3F4F6] last:border-0"
      data-ocid={`search.result.item.${index}`}
    >
      {/* URL */}
      <p className="text-xs text-[#22C55E] truncate mb-1">{displayUrl}</p>

      {/* Title */}
      <a
        href={website.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onClickTrack(website.url)}
        className="text-lg font-medium text-[#006AFF] hover:underline leading-snug block mb-1"
        data-ocid={`search.result.link.${index}`}
      >
        <HighlightedText text={website.title} query={query} />
      </a>

      {/* Description */}
      <p className="text-sm text-[#374151] line-clamp-2 leading-relaxed">
        <HighlightedText text={website.description} query={query} />
      </p>

      {/* Verified badge */}
      {website.isVerified && (
        <div className="flex items-center gap-1 mt-1.5">
          <CheckCircle2 className="h-3 w-3 text-green-600" />
          <span className="text-xs text-green-600 font-medium">Verified</span>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SearchResultsPage() {
  const navigate = useNavigate();
  const q = new URLSearchParams(window.location.search).get("q") ?? "";

  const [inputValue, setInputValue] = useState(q);
  const [focused, setFocused] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const { data: results = [], isLoading } = useSearchWebsites(q);
  const { mutate: recordClick } = useRecordClick();
  const {
    isAuthenticated: isLocalAuth,
    role: authRole,
    user: authUser,
    logout: authLogout,
  } = useAuth();

  const isUserLoggedIn = isLocalAuth && authRole === "user";
  const userInitial = authUser ? authUser.charAt(0).toUpperCase() : "U";

  // Admin-configurable logo URL
  const headerLogoUrl =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("aflino_header_logo_url") || ""
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

  // Sync input + reset page + scroll to top whenever the URL query changes
  useEffect(
    () => {
      setInputValue(q);
      setCurrentPage(1);
      window.scrollTo({ top: 0, behavior: "instant" });
    },
    [q], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleSearch = () => {
    const term = inputValue.trim();
    if (!term) return;
    void navigate({ to: "/search", search: { q: term } });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleClickTrack = (url: string) => {
    recordClick(url);
  };

  const handleUserLogout = () => {
    authLogout();
    setProfileMenuOpen(false);
    void navigate({ to: "/" });
  };

  // Pagination
  const totalPages = Math.ceil(results.length / RESULTS_PER_PAGE);
  const pagedResults = results.slice(
    (currentPage - 1) * RESULTS_PER_PAGE,
    currentPage * RESULTS_PER_PAGE,
  );

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ── Sticky Header ── */}
      <header
        className="sticky top-0 z-20 bg-white border-b border-[#E5E7EB]"
        data-ocid="search.header.section"
      >
        <div className="flex items-center gap-3 px-4 py-3 max-w-3xl mx-auto">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-1.5 flex-shrink-0 no-underline"
            data-ocid="search.home.link"
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
            <span className="font-semibold text-[#111827] text-base tracking-tight hidden sm:block">
              aflino
            </span>
          </Link>

          {/* Pill search bar */}
          <div
            className={`relative flex items-center flex-1 bg-white rounded-full border transition-all ${
              focused
                ? "border-[#006AFF] shadow-[0_0_0_3px_rgba(0,106,255,0.10)]"
                : "border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
            }`}
            style={{ height: "44px" }}
          >
            {/* Left icon */}
            <div className="pl-3 flex-shrink-0">
              <img
                src="/assets/generated/aflino-logo-icon-transparent.dim_64x64.png"
                alt=""
                className="h-5 w-5 object-contain"
              />
            </div>

            {/* Input */}
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Search Aflino..."
              className="flex-1 px-3 bg-transparent outline-none text-[#111827] placeholder:text-[#9CA3AF] text-sm h-full"
              data-ocid="search.search.input"
            />

            {/* Circular search button */}
            <button
              type="button"
              onClick={handleSearch}
              className="flex items-center justify-center h-8 w-8 rounded-full bg-[#006AFF] hover:bg-[#0052CC] text-white transition-colors flex-shrink-0 mr-1.5"
              aria-label="Search"
              data-ocid="search.search.button"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Profile icon — only when user is logged in */}
          {isUserLoggedIn && (
            <div className="relative flex-shrink-0" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((o) => !o)}
                className="h-8 w-8 rounded-full bg-[#006AFF] flex items-center justify-center text-white hover:bg-[#0052CC] transition-colors"
                aria-label={`Profile menu for ${authUser}`}
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
                data-ocid="search.profile.button"
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
                  data-ocid="search.profile.dropdown_menu"
                >
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
                    data-ocid="search.profile.dashboard.link"
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
                    data-ocid="search.profile.submit.link"
                  >
                    Submit Website
                  </button>
                  <div className="border-t border-[#F3F4F6] my-1" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleUserLogout}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    data-ocid="search.profile.logout.button"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-5">
        {/* Result count */}
        {q && !isLoading && results.length > 0 && (
          <p className="text-xs text-[#6B7280] mb-4">
            About{" "}
            <span className="font-medium">
              {results.length.toLocaleString()}
            </span>{" "}
            result{results.length !== 1 ? "s" : ""}
          </p>
        )}

        {/* Loading skeletons */}
        {isLoading && (
          <div data-ocid="search.loading_state">
            {SKELETON_KEYS.map((key) => (
              <ResultSkeleton key={key} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && results.length === 0 && q && (
          <div
            className="flex flex-col items-center text-center py-16"
            data-ocid="search.empty_state"
          >
            <div className="w-14 h-14 rounded-full bg-[#F3F4F6] flex items-center justify-center mb-4">
              <Search className="h-6 w-6 text-[#9CA3AF]" />
            </div>
            <p className="text-lg font-semibold text-[#111827] mb-1">
              No results found for &ldquo;{q}&rdquo;
            </p>
            <p className="text-sm text-[#6B7280] mb-6 max-w-xs">
              Try a different search term or submit your website to get indexed.
            </p>
            <Link
              to="/submit"
              className="px-6 py-2.5 rounded-xl bg-[#006AFF] text-white text-sm font-semibold hover:bg-[#0052CC] transition-colors"
              data-ocid="search.submit.button"
            >
              Submit your website
            </Link>
          </div>
        )}

        {/* No query state */}
        {!isLoading && !q && (
          <div
            className="flex flex-col items-center text-center py-16"
            data-ocid="search.empty_state"
          >
            <p className="text-sm text-[#6B7280]">
              Enter a search term above to get started.
            </p>
          </div>
        )}

        {/* Results list */}
        {!isLoading && pagedResults.length > 0 && (
          <div data-ocid="search.results.list">
            {pagedResults.map((website, i) => (
              <ResultItem
                key={website.id.toString()}
                website={website}
                query={q}
                index={(currentPage - 1) * RESULTS_PER_PAGE + i + 1}
                onClickTrack={handleClickTrack}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div
            className="flex items-center justify-center gap-3 mt-8 mb-4"
            data-ocid="search.pagination.section"
          >
            <button
              type="button"
              onClick={() => {
                setCurrentPage((p) => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: "instant" });
              }}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-4 py-2 rounded-lg border border-[#E5E7EB] text-sm font-medium text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              data-ocid="search.pagination_prev"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            <span className="text-sm text-[#6B7280] px-2">
              Page{" "}
              <span className="font-semibold text-[#111827]">
                {currentPage}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-[#111827]">{totalPages}</span>
            </span>

            <button
              type="button"
              onClick={() => {
                setCurrentPage((p) => Math.min(totalPages, p + 1));
                window.scrollTo({ top: 0, behavior: "instant" });
              }}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-4 py-2 rounded-lg border border-[#E5E7EB] text-sm font-medium text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              data-ocid="search.pagination_next"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="py-4 px-6 border-t border-[#E5E7EB] mt-auto">
        <div className="flex items-center justify-center gap-4 text-xs text-[#9CA3AF]">
          <p>
            &copy; {new Date().getFullYear()}. Built with{" "}
            <span className="text-red-400">&#9829;</span> using{" "}
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
