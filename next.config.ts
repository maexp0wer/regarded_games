import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/securityHeaders";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Security headers (S10) — enforced CSP + baseline hardening on every route.
  // See src/lib/securityHeaders.ts for the policy and the Report-Only escape hatch.
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders() }];
  },

  async rewrites() {
    return [
      {
        source: '/docsproxy',
        destination: 'http://localhost:3001/',
      },
      {
        source: '/docsproxy/:path*',
        destination: 'http://localhost:3001/:path*',
      },
    ];
  },

  // 1. Keep your Turbopack rules (for dev)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },

  // 2. ADD THIS: Webpack rules (for production build)
  // This ensures Webpack converts SVGs to components just like Turbopack does
  webpack(config) {
    // Grab the existing rule that handles SVG imports
    const fileLoaderRule = config.module.rules.find((rule: any) =>
      rule.test?.test?.('.svg'),
    );

    config.module.rules.push(
      // Re-apply the existing rule, but only for svg imports ending in ?url
      {
        ...fileLoaderRule,
        test: /\.svg$/i,
        resourceQuery: /url/, // *.svg?url
      },
      // Convert all other *.svg imports to React components
      {
        test: /\.svg$/i,
        issuer: fileLoaderRule.issuer,
        resourceQuery: { not: [...fileLoaderRule.resourceQuery.not, /url/] }, // exclude if *.svg?url
        use: ['@svgr/webpack'],
      },
    );

    // Modify the file loader rule to ignore *.svg, since we have it handled now
    fileLoaderRule.exclude = /\.svg$/i;

    // Keep your existing Web3 externals
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
    };

    return config;
  },

};

export default nextConfig;