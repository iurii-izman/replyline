/* @refresh reload */
import { render } from "solid-js/web";
import App from "./App";
import type { AppPlatform } from "./app/platform";

declare global {
  interface Window {
    __REPLYLINE_E2E_PLATFORM__?: AppPlatform;
  }
}

const e2ePlatform = window.__REPLYLINE_E2E_PLATFORM__;

render(() => <App platform={e2ePlatform} />, document.getElementById("root") as HTMLElement);
