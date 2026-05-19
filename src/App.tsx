import "./App.css";

import { ShellChrome, MessagesAndFooter } from "./app/ChromeSurface";
import { useReplylineController } from "./app/controller";
import { MainSurface } from "./app/MainSurface";
import { getDefaultPlatform, type AppPlatform } from "./app/platform";
import { SettingsSurface } from "./app/SettingsSurface";

type AppProps = {
  platform?: AppPlatform;
};

function App(props: AppProps) {
  const controller = useReplylineController(props.platform ?? getDefaultPlatform());
  const panelClass = () => (controller.panel() === "settings" ? "app-view app-view--settings" : "app-view app-view--main");

  return (
    <main class="app-root" data-testid="app-root">
      <ShellChrome controller={controller} />
      <div class="app-workarea" data-testid="app-workarea">
        <div class={panelClass()} data-testid="app-view">
          <div class="app-view-inner">
            <MainSurface controller={controller} />
            <SettingsSurface controller={controller} />
          </div>
        </div>
      </div>
      <div class="app-sticky-footer">
        <MessagesAndFooter controller={controller} />
      </div>
    </main>
  );
}

export default App;
