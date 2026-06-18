import { Show, createSignal, onCleanup, onMount } from "solid-js";
import type { ReplylineController } from "../controller";

/**
 * Processing overlay shown during capture → transcribe → analyze pipeline.
 * Shows elapsed time, stage indicator, context-sensitive guidance,
 * and a cancel button during transcribing/analyzing phases.
 */
export function ProcessingState(props: Readonly<{ controller: ReplylineController }>) {
  const controller = () => props.controller;
  const st = () => controller().strings();

  const isCapturing = () => controller().phase() === "capturing";
  const isTranscribing = () => controller().phase() === "transcribing";
  const isAnalyzing = () => controller().phase() === "analyzing";
  const canCancel = () => isTranscribing() || isAnalyzing();

  // ── Elapsed timer ──────────────────────────────────────────────
  const [elapsed, setElapsed] = createSignal(0);
  let timerInterval: ReturnType<typeof setInterval> | null = null;

  onMount(() => {
    timerInterval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
  });

  onCleanup(() => {
    if (timerInterval) clearInterval(timerInterval);
  });

  const elapsedLabel = () => {
    const tpl = st().card.processingElapsed;
    return tpl.replace("{{seconds}}", String(elapsed()));
  };

  // ── Taking-longer hint thresholds ──────────────────────────────
  const takingLonger = () => {
    if (isTranscribing() && elapsed() >= 12) return true;
    if (isAnalyzing() && elapsed() >= 20) return true;
    return false;
  };

  // ── Stage index for pipeline indicator ─────────────────────────
  const stageLabels = () => [
    { label: st().card.processingStageCapture, done: !isCapturing() },
    { label: st().card.processingStageStt, done: false, active: isTranscribing() },
    { label: st().card.processingStageLlm, done: false, active: isAnalyzing() },
    { label: st().card.processingStageCard, done: false },
  ];

  const handleCancel = () => {
    controller().cancelPipeline();
  };

  return (
    <section
      class={`phase-card ${isCapturing() ? "phase-card--recording" : "phase-card--analyzing"}`}
      data-testid="main-state-processing"
    >
      {/* ── Capturing state ─────────────────────────────────────── */}
      <Show when={isCapturing()}>
        <div class="phase-card-row">
          <strong>{st().card.recordingLabel}</strong>
          <span class="phase-elapsed" data-testid="processing-elapsed">
            {elapsedLabel()}
          </span>
        </div>
        <p class="empty-flow-hint">{st().card.releaseToAnalyze}</p>
        <div class="phase-activity-pulse" aria-hidden="true" />
      </Show>

      {/* ── Transcribing / Analyzing state ──────────────────────── */}
      <Show when={!isCapturing()}>
        <div class="phase-card-row">
          <strong data-testid="processing-phase-label">
            {isTranscribing() ? st().header.statusTranscribing : st().header.statusAnalyzing}
          </strong>
          <span class="phase-elapsed" data-testid="processing-elapsed">
            {elapsedLabel()}
          </span>
        </div>
        <p class="empty-flow-hint" data-testid="processing-step-hint">
          {isTranscribing() ? st().card.processingSpeech : st().card.processingReply}
        </p>
        <p class="processing-step-count" data-testid="processing-step-count">
          {isTranscribing() ? st().card.processingStep1of2 : st().card.processingStep2of2}
        </p>

        {/* Pipeline stage dots */}
        <div class="processing-stages" aria-label="Pipeline stages" data-testid="processing-stages">
          {stageLabels().map((stage) => (
            <span
              class={`processing-stage-dot${stage.done ? " is-done" : ""}${stage.active ? " is-active" : ""}`}
              aria-label={stage.label}
              title={stage.label}
            />
          ))}
        </div>

        {/* Taking longer hint */}
        <Show when={takingLonger()}>
          <p class="processing-long-hint" data-testid="processing-long-hint" role="status">
            {st().card.processingTakingLonger}
          </p>
        </Show>

        {/* Cancel action */}
        <Show when={canCancel()}>
          <div class="processing-cancel-area" data-testid="processing-cancel-area">
            <Show when={takingLonger()}>
              <p class="processing-cancel-hint" data-testid="processing-cancel-hint">
                {st().card.processingCancelHint}
              </p>
            </Show>
            <button
              class="btn-ghost btn-compact processing-cancel-btn"
              type="button"
              data-testid="processing-cancel-btn"
              onClick={handleCancel}
            >
              {st().card.cancelProcessing}
            </button>
          </div>
        </Show>
      </Show>

      {/* Progress line animation during analyzing */}
      <Show when={isAnalyzing()}>
        <div class="phase-progress-line" aria-hidden="true" />
      </Show>

      {/* Status detail from backend */}
      <Show when={controller().statusDetail()}>
        <p class="empty-flow-hint">{controller().statusDetail()}</p>
      </Show>
    </section>
  );
}
