import { createMemo, createSignal, onCleanup } from "solid-js";
import type { ReplylineController } from "../controller";
import type { AnswerRewriteStyle } from "../controller/pipelineActions";
import { CheckIcon, CopyIcon } from "../ui/icons";

/**
 * Splits say_now text into a short spoken headline (first sentence) and
 * supporting detail (remaining sentences).  Used for visual hierarchy
 * without changing the schema.
 */
function splitAnswer(text: string): { headline: string; detail: string } {
  const trimmed = text.trim();
  // Find the first sentence boundary: dot+space, question+space, exclamation+space
  const firstSentenceEnd = trimmed.search(/[.!?]\s+/);
  if (firstSentenceEnd < 0) return { headline: trimmed, detail: "" };
  const headline = trimmed.slice(0, firstSentenceEnd + 1).trim();
  const detail = trimmed.slice(firstSentenceEnd + 1).trim();
  return { headline, detail };
}

export function LiveAnswerCard(props: Readonly<{ controller: ReplylineController }>) {
  const controller = () => props.controller;
  const st = () => controller().strings();
  const [copied, setCopied] = createSignal(false);
  let copiedTimer: ReturnType<typeof setTimeout> | null = null;
  const handleCopy = async () => {
    await controller().copyCurrentCard();
    setCopied(true);
    if (copiedTimer) clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => setCopied(false), 2000);
  };
  onCleanup(() => {
    if (copiedTimer) clearTimeout(copiedTimer);
  });

  const answerText = createMemo(() => controller().card()?.sayNow?.trim() ?? "");
  const answerParts = createMemo(() => splitAnswer(answerText()));
  const hasDetail = createMemo(() => answerParts().detail.length > 0);
  const rewriteControls: Array<{ style: AnswerRewriteStyle; label: () => string }> = [
    { style: "shorter", label: () => st().card.rewriteShorter },
    { style: "more_detailed", label: () => st().card.rewriteMoreDetailed },
    { style: "more_direct", label: () => st().card.rewriteMoreDirect },
    { style: "softer", label: () => st().card.rewriteSofter },
  ];

  return (
    <article
      class="result-section result-section--primary answer-hero"
      data-testid="answer-hero-card"
      role="region"
      aria-label={st().card.sayNowLabel}
    >
      <div class="answer-hero-header">
        <div class="result-label">{st().card.sayNowLabel}</div>
        <button
          class={`btn-primary answer-copy-btn ${copied() ? "is-copied" : ""}`}
          type="button"
          aria-label={st().card.copySayNow}
          data-testid="answer-copy-btn"
          onClick={() => void handleCopy()}
        >
          {copied() ? <CheckIcon class="ui-icon--16" /> : <CopyIcon class="ui-icon--16" />}
          <span>{copied() ? st().card.copiedLabel : st().card.copySayNow}</span>
        </button>
      </div>

      <div class="answer-body" data-testid="answer-body">
        <p class="result-text result-text--speak answer-headline" data-testid="answer-headline">
          {answerParts().headline}
        </p>
        <p
          class="result-text answer-detail"
          data-testid="answer-detail"
          classList={{ "answer-detail--empty": !hasDetail() }}
        >
          {hasDetail() ? answerParts().detail : st().card.sayNowHint}
        </p>
      </div>
      <div
        class="answer-rewrite-controls"
        data-testid="answer-rewrite-controls"
        aria-label={st().card.rewriteControlsLabel}
      >
        {rewriteControls.map((control) => (
          <button
            class="btn-ghost btn-compact answer-rewrite-btn"
            type="button"
            disabled={!controller().canRetry()}
            title={controller().retryDisabledReason() ?? ""}
            aria-label={control.label()}
            data-testid={`answer-rewrite-${control.style}`}
            onClick={() => void controller().retryAnalysis(control.style)}
          >
            {control.label()}
          </button>
        ))}
      </div>
    </article>
  );
}
