/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: "export" — enable for production/Capacitor build
  // trailingSlash: true,
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig
