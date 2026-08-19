export function authCookieOptions(environmentName?: string): Readonly<{
  httpOnly: true;
  path: "/";
  sameSite: "lax";
  secure: boolean;
}>;
