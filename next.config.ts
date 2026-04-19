import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "mongoose",
    "bcryptjs",
    "jsonwebtoken",
    "pdf-parse",
    "express",
    "multer",
    "framer-motion",
    "papaparse",
    "xlsx",
    "winston",
    "@google/generative-ai",
  ],

  turbopack: {},
};

export default nextConfig;