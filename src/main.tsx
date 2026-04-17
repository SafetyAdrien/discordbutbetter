import { createRoot } from "react-dom/client";
import { warmCache } from "./lib/cache";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

void warmCache();
