/** @type {import('next').NextConfig} */
const nextConfig = {
  
  // 🎫 只保留：放行組員的特定 IP，讓他可以跨網域連線
  allowedDevOrigins: ['26.133.163.81'],

};

export default nextConfig;