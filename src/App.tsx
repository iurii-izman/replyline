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
    <main class={`shell density-${controller.settings.uiDensity}`}>
      <ShellChrome controller={controller} />
      <div class="shell-body">
        <MainSurface controller={controller} />
        <SettingsSurface controller={controller} />
      </div>
      <MessagesAndFooter controller={controller} />
    </main>
  );
}

export default App;
