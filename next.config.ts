import type { NextConfig } from 'next';

// Served at terraink.space/run: the TerraInk landing (terraink-mobile/web) rewrites /run/* here.
const nextConfig: NextConfig = {
  basePath: '/run',
  // Bare-origin hits (localhost:3000, the raw Vercel URL) land on the app instead of a 404.
  async redirects() {
    return [{ source: '/', destination: '/run', basePath: false, permanent: false }];
  },
};

export default nextConfig;
