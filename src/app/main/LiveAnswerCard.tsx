import { createMemo, createSignal, onCleanup } from "solid-js";
import type { ReplylineController } from "../controller";
import type { AnswerRewriteStyle } from "../controller/pipelineActions";
import { CheckIcon, CopyIcon } from "../ui/icons";

/**
 * Splits say_now text into a short spoken headline (first sentence) and
 * supporting detail (remaining sentences).  Used for visual hierarchy
 * when the rich answer fields (answerShort/answerFull) are absent.
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
  const [copiedShort, setCopiedShort] = createSignal(false);
  let copiedTimer: ReturnType<typeof setTimeout> | null = null;
  let copiedShortTimer: ReturnType<typeof setTimeout> | null = null;
  const handleCopy = async () => {
    await controller().copyCurrentCard();
    setCopied(true);
    if (copiedTimer) clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => setCopied(false), 2000);
  };
  const handleCopyShort = async () => {
    const card = controller().card();
    const text = card?.answerShort?.trim() ?? card?.sayNow?.trim() ?? "";
    if (text) {
      await navigator.clipboard.writeText(text);
      setCopiedShort(true);
      if (copiedShortTimer) clearTimeout(copiedShortTimer);
      copiedShortTimer = setTimeout(() => setCopiedShort(false), 2000);
    }
  };
  onCleanup(() => {
    if (copiedTimer) clearTimeout(copiedTimer);
    if (copiedShortTimer) clearTimeout(copiedShortTimer);
  });

  const card = createMemo(() => controller().card());
  const hasRichAnswer = createMemo(() => {
    const c = card();
    return Boolean(c?.answerShort?.trim() || c?.answerFull?.trim());
  });
  const answerText = createMemo(() => card()?.sayNow?.trim() ?? "");
  const answerParts = createMemo(() => splitAnswer(answerText()));
  const richHeadline = createMemo(() => card()?.answerShort?.trim() ?? answerParts().headline);
  const richDetail = createMemo(() => {
    const c = card();
    return c?.answerFull?.trim() ?? (hasRichAnswer() ? "" : answerParts().detail);
  });
  const followUpLine = createMemo(() => card()?.followUpLine?.trim() ?? "");
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
        <div class="answer-copy-group">
          <button
            class={`btn-primary answer-copy-btn ${copied() ? "is-copied" : ""}`}
            type="button"
            aria-label={st().card.copyFullAnswer}
            data-testid="answer-copy-btn"
            onClick={() => void handleCopy()}
          >
            {copied() ? <CheckIcon class="ui-icon--16" /> : <CopyIcon class="ui-icon--16" />}
            <span>{copied() ? st().card.copiedLabel : st().card.copyFullAnswer}</span>
          </button>
          <button
            class="btn-ghost btn-compact answer-copy-short-btn"
            type="button"
            aria-label={st().card.copyShortAnswer}
            data-testid="answer-copy-short-btn"
            onClick={() => void handleCopyShort()}
          >
            {copiedShort() ? <CheckIcon class="ui-icon--12" /> : <CopyIcon class="ui-icon--12" />}
            <span>{copiedShort() ? st().card.copiedLabel : st().card.copyShortAnswer}</span>
          </button>
        </div>
      </div>

      <div class="answer-body" data-testid="answer-body">
        <section class="answer-section answer-section--short" data-testid="answer-section-short">
          <h3 class="answer-section-label">{st().card.shortAnswerLabel}</h3>
          <p class="result-text result-text--speak answer-headline" data-testid="answer-headline">
            {richHeadline()}
          </p>
        </section>
        <section class="answer-section answer-section--full" data-testid="answer-section-full">
          <h3 class="answer-section-label">{st().card.fullAnswerLabel}</h3>
          <p
            class="result-text answer-detail"
            data-testid="answer-detail"
            classList={{ "answer-detail--empty": !richDetail() }}
          >
            {richDetail() || (hasRichAnswer() ? "" : st().card.sayNowHint)}
          </p>
        </section>
        {followUpLine() && (
          <section
            class="answer-section answer-section--follow-up"
            data-testid="answer-section-follow-up"
          >
            <h3 class="answer-section-label">{st().card.followUpLabel}</h3>
            <p class="result-text answer-follow-up" data-testid="answer-follow-up">
              {followUpLine()}
            </p>
          </section>
        )}
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
