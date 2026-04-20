/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: "/awhroster",
  trailingSlash: true,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_BASE_PATH: "/awhroster",
  },
};

export default nextConfig;
