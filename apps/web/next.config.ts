import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@chainboard/ui', '@chainboard/types', '@chainboard/utils'],
  serverExternalPackages: ['viem', 'wagmi'],
};

export default nextConfig;
