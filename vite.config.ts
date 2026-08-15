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
  plugins: [
    react(),
    mcpPlugin(),
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
