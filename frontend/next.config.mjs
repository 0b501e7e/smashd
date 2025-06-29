/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5001',
        pathname: '/images/**',
      },
      // Production backend domain
      {
        protocol: 'https',
        hostname: 'backend-production-e9ac.up.railway.app',
        pathname: '/images/**',
      },
    ],
  },
};

export default nextConfig;
