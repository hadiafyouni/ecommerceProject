import type { NextConfig } from 'next';

// next/image is only used for local assets in /public. Product, category and
// banner images are admin-supplied URLs from arbitrary hosts and are rendered
// with plain <img>, so no remotePatterns are needed (a wildcard pattern would
// turn the image optimizer into an open proxy).
const nextConfig: NextConfig = {};

export default nextConfig;
