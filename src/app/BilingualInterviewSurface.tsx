import { For, Show, createMemo } from "solid-js";
import type { BilingualDisplaySegment, BilingualSessionStatus } from "./model";
import type { ReplylineController } from "./controller";

type StatusTone = "idle" | "starting" | "active" | "reconnecting" | "degraded" | "stopping" | "error";

function formatLatency(value: number | undefined): string {
  if (!Number.isFinite(value) || value === undefined) return "—";
  return `${Math.max(0, Math.round(value))} ms`;
}

function statusTone(
  status: BilingualSessionStatus,
  degraded: boolean,
  hasError: boolean,
): StatusTone {
  if (hasError) return "error";
  if (status === "starting") return "starting";
  if (status === "active" && degraded) return "degraded";
  if (status === "active") return "active";
  if (status === "reconnecting") return "reconnecting";
  if (status === "stopping") return "stopping";
  return "idle";
}

function statusText(controller: ReplylineController, tone: StatusTone): string {
  const st = controller.strings();
  if (tone === "starting") return st.card.bilingual.status.starting;
  if (tone === "active") return st.card.bilingual.status.active;
  if (tone === "reconnecting") return st.card.bilingual.status.reconnecting;
  if (tone === "degraded") return st.card.bilingual.status.degraded;
  if (tone === "stopping") return st.card.bilingual.status.stopping;
  if (tone === "error") return st.card.bilingual.status.error;
  return st.card.bilingual.status.idle;
}

function LiveTranscriptLane(props: Readonly<{ controller: ReplylineController }>) {
  const st = () => props.controller.strings();
  const state = () => props.controller.bilingualInterviewState();
  return (
    <section class="bilingual-lane" data-testid="bilingual-live-transcript-lane">
      <h3 class="bilingual-lane-title">{st().card.bilingual.liveTranscriptTitle}</h3>
      <div class="bilingual-lane-list">
        <For each={state().transcriptSegments}>
          {(segment) => (
            <p class="bilingual-transcript-line" data-testid={`bilingual-final-${segment.segmentId}`}>
              {segment.text}
            </p>
          )}
        </For>
        <Show when={state().latestPartial}>
          {(segment) => (
            <p class="bilingual-transcript-line is-partial" data-testid="bilingual-partial-en">
              {segment().text}
            </p>
          )}
        </Show>
      </div>
    </section>
  );
}

function translationForSegment(segment: BilingualDisplaySegment): string | null {
  const text = segment.translatedText?.trim() ?? "";
  return text ? text : null;
}

function LiveTranslationLane(props: Readonly<{ controller: ReplylineController }>) {
  const state = () => props.controller.bilingualInterviewState();
  const st = () => props.controller.strings();
  const hasFallback = createMemo(() =>
    state().translationSegments.some((segment) => segment.isFallback),
  );

  return (
    <section class="bilingual-lane" data-testid="bilingual-live-translation-lane">
      <h3 class="bilingual-lane-title">{st().card.bilingual.liveTranslationTitle}</h3>
      <div class="bilingual-lane-list">
        <For each={state().displaySegments}>
          {(segment) => (
            <Show when={translationForSegment(segment)}>
              {(text) => (
                <p class="bilingual-translation-line" data-testid={`bilingual-ru-${segment.segmentId}`}>
                  {text()}
                </p>
              )}
            </Show>
          )}
        </For>
      </div>
      <Show when={hasFallback()}>
        <p class="bilingual-translation-warning" data-testid="bilingual-translation-warning">
          {st().card.bilingual.translationFallbackWarning}
        </p>
      </Show>
    </section>
  );
}

function BilingualAnswerLane(props: Readonly<{ controller: ReplylineController }>) {
  const st = () => props.controller.strings();
  const state = () => props.controller.bilingualInterviewState();
  const answer = createMemo(() => {
    const finalAnswer = state().lastAnswerCard?.answer.main?.trim() ?? "";
    if (finalAnswer) return finalAnswer;
    return state().streamedAnswerText.trim();
  });
  const questionEn = createMemo(() => state().lastAnswerCard?.question.cleanQuestion?.trim() ?? "");
  const questionRu = createMemo(() => state().lastAnswerCard?.question.rawTranscript?.trim() ?? "");
  return (
    <section class="bilingual-answer-lane" data-testid="bilingual-answer-lane">
      <h3 class="bilingual-lane-title">{st().card.bilingual.answerTitle}</h3>
      <div class="bilingual-question-box" data-testid="bilingual-question-lane">
        <p class="bilingual-question-label">{st().card.bilingual.questionTitle}</p>
        <p class="bilingual-question-en">{questionEn()}</p>
        <Show when={questionRu()}>
          <p class="bilingual-question-ru">{questionRu()}</p>
        </Show>
      </div>
      <p class="bilingual-answer-text" data-testid="bilingual-answer-text">
        {answer() || st().card.bilingual.answerEmpty}
      </p>
      <button
        class="btn-secondary btn-compact"
        type="button"
        onClick={() => void props.controller.copyCurrentCard()}
      >
        {st().card.copySayNow}
      </button>
    </section>
  );
}

function BilingualStatusBar(props: Readonly<{ controller: ReplylineController }>) {
  const state = () => props.controller.bilingualInterviewState();
  const st = () => props.controller.strings();
  const latestTranslationLatency = createMemo(() =>
    state().latency?.translationMs
      ?? (state().translationSegments.length > 0
        ? state().translationSegments[state().translationSegments.length - 1]?.latencyMs
        : undefined),
  );
  const answerLatency = createMemo<number | undefined>(() => state().latency?.answerTotalMs);
  const tone = createMemo(() =>
    statusTone(state().status, state().degraded, Boolean(state().lastError)),
  );
  return (
    <section class="bilingual-status-bar" data-testid="bilingual-status-bar">
      <span class={`bilingual-status-dot is-${tone()}`} data-testid="bilingual-status-dot" />
      <span class="bilingual-status-text" data-testid="bilingual-status-text">
        {statusText(props.controller, tone())}
      </span>
      <span class="bilingual-status-metric">
        {st().card.bilingual.sttLatencyLabel}: {formatLatency(state().latency?.latencyMs)}
      </span>
      <span class="bilingual-status-metric">
        {st().card.bilingual.translationLatencyLabel}: {formatLatency(latestTranslationLatency())}
      </span>
      <span class="bilingual-status-metric">
        {st().card.bilingual.answerLatencyLabel}: {formatLatency(answerLatency())}
      </span>
    </section>
  );
}

export function BilingualInterviewSurface(props: Readonly<{ controller: ReplylineController }>) {
  const st = () => props.controller.strings();
  const state = () => props.controller.bilingualInterviewState();
  const tone = createMemo(() =>
    statusTone(state().status, state().degraded, Boolean(state().lastError)),
  );
  return (
    <section class="bilingual-surface" data-testid="bilingual-interview-surface">
      <header class="bilingual-header">
        <div>
          <h2 class="bilingual-title">{st().card.bilingual.headerTitle}</h2>
          <p class="bilingual-subtitle">{st().card.bilingual.headerSubtitle}</p>
        </div>
        <span class={`bilingual-status-dot is-${tone()}`} />
      </header>
      <div class="bilingual-grid">
        <LiveTranscriptLane controller={props.controller} />
        <LiveTranslationLane controller={props.controller} />
      </div>
      <BilingualAnswerLane controller={props.controller} />
      <BilingualStatusBar controller={props.controller} />
    </section>
  );
}
