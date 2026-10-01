import { createRoot } from "react-dom/client";

import App from "./App";
import "./styles.css";

// Chrome fires this once, usually before the lazily loaded app module is ready, so keep it for later.
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  (window as unknown as { __nosInstallPrompt?: Event }).__nosInstallPrompt = event;
});

createRoot(document.getElementById("root")!).render(<App />);
