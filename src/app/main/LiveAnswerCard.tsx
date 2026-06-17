import { createSignal, onCleanup } from "solid-js";
import type { ReplylineController } from "../controller";

export function LiveAnswerCard(props: Readonly<{ controller: ReplylineController }>) {
  const controller = () => props.controller;
  const st = () => controller().strings();
  const [copied, setCopied] = createSignal(false);
  let copiedTimer: ReturnType<typeof setTimeout> | null = null;
  const handleCopy = async () => {
    await controller().copyCurrentCard();
    setCopied(true);
    if (copiedTimer) clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => setCopied(false), 1200);
  };
  onCleanup(() => {
    if (copiedTimer) clearTimeout(copiedTimer);
  });

  return (
    <article
      class="result-section result-section--primary answer-hero"
      data-testid="answer-hero-card"
    >
      <div class="answer-hero-header">
        <div class="result-label">{st().card.sayNowLabel}</div>
        <button
          class={`btn-primary answer-copy-btn ${copied() ? "is-copied" : ""}`}
          type="button"
          aria-label={st().card.copySayNow}
          onClick={() => void handleCopy()}
        >
          {copied() ? st().card.copiedLabel : st().card.copySayNow}
        </button>
      </div>
      <p class="result-text result-text--speak" data-testid="section-say-now">
        {controller().card()?.sayNow?.trim()}
      </p>
      <p class="empty-flow-hint">{st().card.sayNowHint}</p>
    </article>
  );
}
