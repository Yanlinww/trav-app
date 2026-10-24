/** @type {import('next').NextConfig} */
const internalApiOrigin = process.env.INTERNAL_API_ORIGIN ?? "http://localhost:8080";

const nextConfig = {
  allowedDevOrigins: ['26.133.163.81', '192.168.213.11', '127.0.0.1'],
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: `${internalApiOrigin}/:path*`,
      },
    ];
  },
};

export default nextConfig;
