/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: ".",
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors https://*.sitecorecloud.io https://*.sitecore.cloud",
          },
        ],
      },
    ]
  },
}

export default nextConfig
