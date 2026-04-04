// Client-side security utility for Aflino Search Engine
// Provides input validation and sanitization functions

const INJECTION_PATTERNS = [
  /<script/i,
  /<\/script/i,
  /eval\s*\(/i,
  /javascript:/i,
  /<iframe/i,
  /<\/iframe/i,
  /DROP\s+TABLE/i,
  /SELECT\s+\*\s+FROM/i,
  /INSERT\s+INTO/i,
  /UNION\s+SELECT/i,
  /onerror\s*=/i,
  /onload\s*=/i,
  /onclick\s*=/i,
  /alert\s*\(/i,
  /document\.cookie/i,
  /window\.location/i,
];

function hasInjectionPattern(text: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Sanitizes text: trims whitespace and strips non-printable control characters
 * (keeps tab U+0009, LF U+000A, CR U+000D).
 */
export function sanitizeText(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // Keep printable ASCII (32+), tab (9), LF (10), CR (13), and all non-ASCII
    if (code === 9 || code === 10 || code === 13 || code >= 32) {
      result += text[i];
    }
  }
  return result.trim();
}

/**
 * Validates a URL. Returns an error message string or null if valid.
 */
export function validateUrl(url: string): string | null {
  const cleaned = sanitizeText(url);
  if (!cleaned) return "URL is required";
  if (cleaned.length > 500) return "URL must not exceed 500 characters";
  if (!cleaned.startsWith("http://") && !cleaned.startsWith("https://")) {
    return "URL must start with http:// or https://";
  }
  if (hasInjectionPattern(cleaned)) {
    return "URL contains disallowed patterns";
  }
  return null;
}

/**
 * Validates a title. Returns an error message string or null if valid.
 */
export function validateTitle(title: string): string | null {
  const cleaned = sanitizeText(title);
  if (!cleaned) return "Title is required";
  if (cleaned.length < 1 || cleaned.length > 200) {
    return "Title must be between 1 and 200 characters";
  }
  if (hasInjectionPattern(cleaned)) {
    return "Title contains disallowed patterns";
  }
  return null;
}

/**
 * Validates a description. Returns an error message string or null if valid.
 */
export function validateDescription(desc: string): string | null {
  if (!desc) return null; // optional
  const cleaned = sanitizeText(desc);
  if (cleaned.length > 2000) {
    return "Description must not exceed 2000 characters";
  }
  if (hasInjectionPattern(cleaned)) {
    return "Description contains disallowed patterns";
  }
  return null;
}

/**
 * Validates keywords (comma-separated string).
 * Returns an error message string or null if valid.
 */
export function validateKeywords(keywords: string): string | null {
  if (!keywords.trim()) return null; // optional
  const items = keywords
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  if (items.length > 20) {
    return "Maximum 20 keywords allowed";
  }
  for (const item of items) {
    if (item.length > 50) {
      return `Keyword "${item.slice(0, 20)}\u2026" exceeds 50 characters`;
    }
    if (hasInjectionPattern(item)) {
      return "Keywords contain disallowed patterns";
    }
  }
  return null;
}

/**
 * Validates a search query. Returns an error message string or null if valid.
 */
export function validateSearchQuery(query: string): string | null {
  const cleaned = sanitizeText(query);
  if (cleaned.length > 200) {
    return "Search query must not exceed 200 characters";
  }
  if (hasInjectionPattern(cleaned)) {
    return "Search query contains disallowed patterns";
  }
  return null;
}
