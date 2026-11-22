// Tunable client-side limits. Server-side limits for C/C++ live in
// backend/config/limits.yaml (admin-editable, no code change needed).
export const CLIENT_LIMITS = {
  /** Max characters of program output kept on screen before the run is stopped. */
  maxOutputChars: 64 * 1024,
  /** Show the "maybe a loop never stops?" hint after this many seconds of running. */
  longRunHintSeconds: 8,
  /** If Stop doesn't take effect within this time, the Python worker is restarted. */
  hardStopMs: 1500,
  /** Max characters a single line typed into input() may have. */
  maxInputChars: 4000,
};
