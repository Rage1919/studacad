const pagesBasePath = process.env.PAGES_BASE_PATH;

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  experimental: { proxyClientMaxBodySize: "12mb" },
  ...(pagesBasePath
    ? {
        output: "export",
        basePath: pagesBasePath,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
