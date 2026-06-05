/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent pdfjs-dist from trying to require the native 'canvas' package on the server.
  // PDF conversion happens client-side only; this alias is a safety net for webpack.
  webpack(config) {
    config.resolve.alias.canvas = false;
    return config;
  },
  images: {
    remotePatterns: [
      // Cloudflare R2 — both direct endpoint and public r2.dev URLs
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "**.r2.dev" },
      { protocol: "https", hostname: "**.cloudflare.com" },
      // FAL.ai CDN — wildcard covers v3.fal.media, cdn.fal.media, etc.
      { protocol: "https", hostname: "fal.media" },
      { protocol: "https", hostname: "**.fal.media" },
      { protocol: "https", hostname: "**.fal.ai" },
      // FAL sometimes proxies through Google Cloud Storage
      { protocol: "https", hostname: "storage.googleapis.com" },
      // Clerk avatars
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
};

export default nextConfig;
