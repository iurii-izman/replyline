import { Show } from "solid-js";
import type { ReplylineController } from "../controller";

export function ProcessingState(props: Readonly<{ controller: ReplylineController }>) {
  const controller = () => props.controller;
  const st = () => controller().strings();
  const isRecording = () => controller().phase() === "capturing";
  const isAnalyzing = () => controller().phase() === "analyzing";

  return (
    <section
      class={`phase-card ${isRecording() ? "phase-card--recording" : "phase-card--analyzing"}`}
      data-testid="main-state-processing"
    >
      <Show
        when={isRecording()}
        fallback={
          <>
            <strong>{st().header.statusAnalyzing}</strong>
            <p class="empty-flow-hint">
              {st().card.processingSpeech} {"->"} {st().card.processingReply}
            </p>
          </>
        }
      >
        <div class="phase-card-row">
          <strong>{st().card.recordingLabel}</strong>
          <span>{controller().phaseLabel()}</span>
        </div>
        <p class="empty-flow-hint">{st().card.releaseToAnalyze}</p>
        <div class="phase-activity-pulse" aria-hidden="true" />
      </Show>
      <Show when={isAnalyzing()}>
        <div class="phase-progress-line" aria-hidden="true" />
      </Show>
      <Show when={controller().statusDetail()}>
        <p class="empty-flow-hint">{controller().statusDetail()}</p>
      </Show>
    </section>
  );
}
