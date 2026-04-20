/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: "/awhroaster",
  trailingSlash: true,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_BASE_PATH: "/awhroaster",
  },
};

export default nextConfig;
