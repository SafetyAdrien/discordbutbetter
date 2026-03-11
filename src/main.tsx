import { createRoot } from "react-dom/client";
import { warmCache } from "./lib/cache";
import App from "./App.tsx";
import "./index.css";

// Warm the IndexedDB → memory cache before rendering
warmCache().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
