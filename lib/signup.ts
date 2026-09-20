// Server-only. Set DISABLE_SIGNUP=true once your own account exists: the
// /signup page redirects to /login, the login page hides the sign-up link and
// Better-Auth rejects sign-up requests. Public deployments should turn this
// on, otherwise anyone who finds the URL can register and use the AI
// features on your API keys.
export function isSignupDisabled(): boolean {
  return process.env.DISABLE_SIGNUP === "true";
}
