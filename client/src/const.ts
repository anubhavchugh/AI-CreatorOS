/**
 * App-level constants.
 * Auth is handled by Clerk — no manual login URL construction needed.
 */

// Kept for backward compatibility — redirects to Clerk sign-in page
export const getLoginUrl = (returnPath?: string) => {
  const path = returnPath || window.location.pathname;
  return `/sign-in?redirect_url=${encodeURIComponent(path)}`;
};
