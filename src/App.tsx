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

  return (
    <main class="shell app-shell">
      <ShellChrome controller={controller} />
      <div class="shell-body app-body">
        <div class="app-content">
          <div class="app-content-grid">
            <MainSurface controller={controller} />
            <SettingsSurface controller={controller} />
            <aside class="app-side-column" aria-hidden="true" />
          </div>
        </div>
      </div>
      <MessagesAndFooter controller={controller} />
    </main>
  );
}

export default App;
