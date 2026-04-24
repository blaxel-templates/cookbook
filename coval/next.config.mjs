/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingIncludes: {
    '/api/generate': ['./codegen-sandbox/app/**/*'],
  },
};

export default nextConfig;