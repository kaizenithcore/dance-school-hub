/**
 * Shared application constants.
 *
 * Add here any magic number or string that appears in more than one place
 * or whose meaning isn't obvious from context alone.
 */

// ── Timings ───────────────────────────────────────────────────────────────────

/** Undo window for destructive actions (delete room, post, etc.) — ms */
export const DELETE_UNDO_MS = 5_000;

/** Auth context request timeout before falling back to Supabase direct — ms */
export const AUTH_CONTEXT_TIMEOUT_MS = 10_000;

// ── API ───────────────────────────────────────────────────────────────────────

/**
 * Fallback API base URL used by the API client when VITE_API_URL is not set.
 * In development the Vite proxy already forwards /api → localhost:3000, so
 * this URL is only hit when the proxy is bypassed (second candidate in client.ts).
 */
export const DEFAULT_API_BASE_URL = "http://localhost:3000";

// ── Pagination ────────────────────────────────────────────────────────────────

/** Default page size for list endpoints */
export const DEFAULT_PAGE_SIZE = 20;

/** Maximum items returned in typeahead/search dropdowns */
export const SEARCH_RESULT_LIMIT = 50;

// ── Business rules ────────────────────────────────────────────────────────────

/** Minimum passing grade for exam certifications (legacy, kept for reference) */
export const CERTIFICATION_PASS_GRADE = 60;

/** Days before trial expiry to start showing the warning banner */
export const TRIAL_WARNING_DAYS = 3;
