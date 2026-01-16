/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  server: {
    port: process.env.PORT || 3000,
    hostname: process.env.HOST || '0.0.0.0',
  },
};

export default nextConfig;