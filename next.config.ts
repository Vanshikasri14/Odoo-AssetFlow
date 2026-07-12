import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  turbopack: {
    // There is a stray package-lock.json in the user's home directory, so Next
    // guesses the workspace root is C:\Users\ASUS and warns about it on every
    // boot. Pin the root to this project and the warning goes away.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
