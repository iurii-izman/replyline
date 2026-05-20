import { Show } from "solid-js";
import { CandidatePackStudio } from "./CandidatePackStudio";
import type { ReplylineController } from "./controller";

export function CandidatePackStudioSurface(props: { controller: ReplylineController }) {
  const controller = () => props.controller;
  const st = () => controller().strings();

  return (
    <Show when={controller().panel() === "candidatePackStudio"}>
      <section
        class="settings-card surface-panel app-page app-page--settings settings-layout"
        data-testid="candidate-pack-studio-surface"
      >
        <div class="app-page-header candidate-pack-studio-header">
          <h2 class="section-title">{st().settings.candidatePackStudioTitle}</h2>
          <p class="settings-section-hint">{st().settings.candidatePackStudioSubtitle}</p>
        </div>
        <CandidatePackStudio controller={controller()} st={st()} />
      </section>
    </Show>
  );
}
