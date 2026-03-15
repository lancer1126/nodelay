import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

const hideBootSplash = () => {
  const splash = document.getElementById("boot-splash");
  if (!splash) return;

  splash.classList.add("boot-splash-hide");
  window.setTimeout(() => {
    splash.remove();
  }, 360);
};

requestAnimationFrame(() => {
  requestAnimationFrame(hideBootSplash);
});
