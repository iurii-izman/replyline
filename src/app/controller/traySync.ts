import { createEffect, type Accessor } from "solid-js";
import type { Phase } from "../model";
import type { AppPlatform } from "../platform";
import { traySyncPayload } from "../controller_status";

export interface TraySyncDeps {
  platform: AppPlatform;
  phase: Accessor<Phase>;
  statusDetail: Accessor<string | null>;
  setupRequired: Accessor<boolean>;
  hotkeyFailed: Accessor<boolean>;
  hasError: Accessor<boolean>;
}

export function setupTraySync(deps: TraySyncDeps): void {
  createEffect(() => {
    if (deps.phase() === "booting") return;
    const { phase: trayPhase, detail } = traySyncPayload({
      phase: deps.phase(),
      statusDetail: deps.statusDetail(),
      setupRequired: deps.setupRequired(),
      hotkeyFailed: deps.hotkeyFailed(),
      hasError: deps.hasError(),
    });
    void deps.platform
      .invoke("sync_tray_ui_phase", { phase: trayPhase, detail })
      .catch(() => undefined);
  });
}
