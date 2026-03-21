import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { shouldRegisterServiceWorker } from "./lib/pwa";

createRoot(document.getElementById("root")!).render(<App />);

if (shouldRegisterServiceWorker(import.meta.env.PROD, "serviceWorker" in navigator)) {
  void import("virtual:pwa-register").then(({ registerSW }) => {
    registerSW({ immediate: true });
  });
}
