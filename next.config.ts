import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Map Editor was renamed Background Editor; keep old links and bookmarks working.
  async redirects() {
    return [
      { source: '/map_editor', destination: '/background_editor', permanent: true },
      { source: '/map_examples.html', destination: '/background_examples.html', permanent: true },
    ];
  },
};

export default nextConfig;
