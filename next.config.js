/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ビルド時にESLintエラーを無視
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ビルド時に型チェックエラーを無視（オプション）
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ['pg', 'drizzle-orm'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Konva canvas エラー回避
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
        encoding: false,
      };
    } else {
      // サーバーサイドでもcanvasを無視
      config.externals = [...(config.externals || []), 'canvas'];
    }
    return config;
  },
}

module.exports = nextConfig
