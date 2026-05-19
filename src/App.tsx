import "./App.css";

import { ShellChrome, MessagesAndFooter } from "./app/ChromeSurface";
import { CandidatePackStudioSurface } from "./app/CandidatePackStudioSurface";
import { useReplylineController } from "./app/controller";
import { MainSurface } from "./app/MainSurface";
import { getDefaultPlatform, type AppPlatform } from "./app/platform";
import { SettingsSurface } from "./app/SettingsSurface";

type AppProps = {
  platform?: AppPlatform;
};

function App(props: AppProps) {
  const controller = useReplylineController(props.platform ?? getDefaultPlatform());
  const panelClass = () => {
    if (controller.panel() === "main") return "app-view app-view--main";
    if (controller.panel() === "candidatePackStudio") return "app-view app-view--studio";
    return "app-view app-view--settings";
  };

  return (
    <main class="app-root" data-testid="app-root">
      <ShellChrome controller={controller} />
      <div class="app-workarea" data-testid="app-workarea">
        <div class={panelClass()} data-testid="app-view">
          <div class="app-view-inner">
            <MainSurface controller={controller} />
            <SettingsSurface controller={controller} />
            <CandidatePackStudioSurface controller={controller} />
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
