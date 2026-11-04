import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  esbuild: {
    // Strip console.log and console.debug in production to prevent data leakage
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  build: {
    // Electron (Chromium recent) et navigateurs actuels : pas de transpilation ni de polyfill inutiles.
    target: "es2022",
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        // Bibliotheques lourdes dans des fichiers a part : meilleur cache, et celles qui ne
        // servent que sur certains ecrans (appel vocal, graphiques) ne gonflent pas le demarrage.
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("livekit")) return "vendor-livekit";
          if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
          if (id.includes("framer-motion")) return "vendor-motion";
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("date-fns")) return "vendor-date";
          return undefined;
        },
      },
    },
  },
  plugins: [
    react(),
    // Dev-only tooling: these have no role in a production build and were
    // previously mounted unconditionally.
    mode === "development" && mcpPlugin(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // @dnd-kit/* → local react-dnd compatibility shim (Discord-style)
      "@dnd-kit/core": path.resolve(__dirname, "./src/lib/dnd-shim/core.tsx"),
      "@dnd-kit/sortable": path.resolve(__dirname, "./src/lib/dnd-shim/sortable.tsx"),
      "@dnd-kit/utilities": path.resolve(__dirname, "./src/lib/dnd-shim/utilities.ts"),
      "@dnd-kit/modifiers": path.resolve(__dirname, "./src/lib/dnd-shim/modifiers.ts"),
    },
  },
}));
