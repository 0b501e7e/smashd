/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5001', // Specify the port your backend is running on
        pathname: '/images/**', // Allow any image path under /images
      },
      // Add other allowed domains here if needed for production, e.g.:
      // {
      //   protocol: 'https',
      //   hostname: 'your-production-api-domain.com',
      //   pathname: '/images/**',
      // },
    ],
  },
};

module.exports = nextConfig; 