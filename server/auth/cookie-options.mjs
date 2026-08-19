export function authCookieOptions(environmentName) {
  return Object.freeze({
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: environmentName !== "development" && environmentName !== "test"
  });
}
