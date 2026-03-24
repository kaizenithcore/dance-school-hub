import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeTheme } from "@/lib/theme";

initializeTheme();

if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  void navigator.serviceWorker.register("/portal-sw.js");
}

createRoot(document.getElementById("root")!).render(
  <App />
);
