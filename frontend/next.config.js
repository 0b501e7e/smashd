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
      // Production backend domain
      {
        protocol: 'https',
        hostname: 'backend-production-e9ac.up.railway.app',
        pathname: '/images/**',
      },
      // Cloudinary
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig; 