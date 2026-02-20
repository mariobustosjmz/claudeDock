import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent } from "./app/app.component";
import { appConfig } from "./app/app.config";
import { emit } from "@tauri-apps/api/event";

// Expose Tauri v2 event API for mcp-bridge compatibility (uses window.__TAURI__.event.emit)
if (typeof window !== "undefined") {
  const w = window as Window & { __TAURI__?: { event?: { emit: typeof emit } } };
  if (w.__TAURI__) {
    w.__TAURI__.event = { emit };
  }
}

bootstrapApplication(AppComponent, appConfig).catch((err) =>
  console.error(err),
);
