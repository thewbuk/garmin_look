import type { NextConfig } from 'next';

// Served at terraink.space/run: the TerraInk landing (terraink-mobile/web) rewrites /run/* here.
const nextConfig: NextConfig = { basePath: '/run' };

export default nextConfig;
