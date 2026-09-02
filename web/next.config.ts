import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* The dev route indicator overlays the bottom left corner, which lands on the
     field surface's tab bar and on the console rail. It is capture noise in
     every review raster, and review rasters are supposed to carry the build,
     not the toolchain. */
  devIndicators: false,
  experimental: {
    /* The icon package is a 188KB barrel re-exporting roughly 1500 icons, and
       it is not in Next's default optimize list. Production tree-shakes it via
       sideEffects: false; this is about dev-mode barrel compilation, where the
       console currently pulls one 91KB chunk for 48 icons. */
    optimizePackageImports: ["@phosphor-icons/react"],
  },
};

export default nextConfig;
