import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
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
  plugins: [
    react(),
    mcpPlugin(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,otf}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      manifest: {
        name: "NexusChat - Messagerie Gaming",
        short_name: "NexusChat",
        description: "Messagerie et VoIP pour gamers",
        theme_color: "#1a1a2e",
        background_color: "#1a1a2e",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
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
