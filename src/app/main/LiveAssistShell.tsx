import { For, Show } from "solid-js";
import type { ReplylineController } from "../controller";
import { LiveAnswerCard } from "./LiveAnswerCard";
import { InsightStrip } from "./InsightStrip";
import { WorkspaceSidePanel } from "./WorkspaceSidePanel";
import {
  interviewCardLabel,
  interviewCardTabId,
  interviewCardPanelId,
  joinList,
} from "./helpers";

export function LiveAssistShell(
  props: Readonly<{
    controller: ReplylineController;
    showSidePanel: boolean;
    compactLayout: boolean;
  }>,
) {
  const controller = () => props.controller;
  const interviewTabRefs: HTMLButtonElement[] = [];
  const focusInterviewCard = (nextIndex: number) => {
    const cardCount = controller().interviewCardKeys().length;
    const safeIndex = Math.min(Math.max(0, nextIndex), Math.max(0, cardCount - 1));
    controller().selectInterviewCardIndex(safeIndex);
    interviewTabRefs[safeIndex]?.focus();
  };
  return (
    <div
      class={`main-cockpit-layout ${props.showSidePanel && !props.compactLayout ? "is-wide" : "is-compact"} ${props.showSidePanel ? "has-side-panel" : "no-side-panel"}`}
      data-testid="workspace-layout"
    >
      <article class="result-card cockpit-main app-page-main" data-testid="main-card-shell">
        <Show
          when={controller().card()?.mode !== "interview"}
          fallback={
            <>
              <div class="interview-card-controls" data-testid="interview-card-controls">
                <button
                  class="btn-ghost"
                  type="button"
                  aria-label={controller().strings().card.interview.prevCard}
                  onClick={() => focusInterviewCard(controller().activeInterviewCardIndex() - 1)}
                >
                  ←
                </button>
                <div
                  class="interview-card-tabs"
                  role="tablist"
                  aria-orientation="horizontal"
                  aria-label={controller().strings().card.interview.carouselLabel}
                >
                  <For each={controller().interviewCardKeys()}>
                    {(key, index) => {
                      const tabIndex = index();
                      const isActive = () => controller().activeInterviewCardIndex() === tabIndex;
                      return (
                        <button
                          ref={(element) => {
                            interviewTabRefs[tabIndex] = element;
                          }}
                          class={`interview-card-tab ${isActive() ? "is-active" : ""}`}
                          type="button"
                          role="tab"
                          id={interviewCardTabId(key)}
                          aria-selected={isActive()}
                          aria-controls={interviewCardPanelId(key)}
                          tabIndex={isActive() ? 0 : -1}
                          aria-label={`${tabIndex + 1}. ${interviewCardLabel(controller(), key)}`}
                          onClick={() => focusInterviewCard(tabIndex)}
                          onKeyDown={(event) => {
                            if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                              event.preventDefault();
                              focusInterviewCard(tabIndex + 1);
                            } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                              event.preventDefault();
                              focusInterviewCard(tabIndex - 1);
                            } else if (event.key === "Home") {
                              event.preventDefault();
                              focusInterviewCard(0);
                            } else if (event.key === "End") {
                              event.preventDefault();
                              focusInterviewCard(controller().interviewCardKeys().length - 1);
                            }
                          }}
                        >
                          {tabIndex + 1}. {interviewCardLabel(controller(), key)}
                        </button>
                      );
                    }}
                  </For>
                </div>
                <button
                  class="btn-ghost"
                  type="button"
                  aria-label={controller().strings().card.interview.nextCard}
                  onClick={() => focusInterviewCard(controller().activeInterviewCardIndex() + 1)}
                >
                  →
                </button>
                <button
                  class="btn-ghost"
                  type="button"
                  aria-label={controller().strings().card.interview.pinCard}
                  aria-pressed={Boolean(controller().pinnedInterviewCard())}
                  onClick={() => controller().togglePinInterviewCard()}
                >
                  {controller().pinnedInterviewCard()
                    ? controller().strings().card.interview.unpinCard
                    : controller().strings().card.interview.pinCard}
                </button>
              </div>
              <Show when={controller().activeInterviewCardKey() === "answer"}>
                <section
                  class="result-section result-section--primary"
                  id={interviewCardPanelId("answer")}
                  role="tabpanel"
                  aria-labelledby={interviewCardTabId("answer")}
                  data-testid="section-interview-answer"
                >
                  <div class="result-label">{controller().strings().card.interview.answer}</div>
                  <p class="result-text result-text--speak">
                    {controller().card()?.mode === "interview"
                      ? controller().card().interview.answer.main
                      : ""}
                  </p>
                </section>
              </Show>
              <Show when={controller().activeInterviewCardKey() === "question"}>
                <section
                  class="result-section"
                  id={interviewCardPanelId("question")}
                  role="tabpanel"
                  aria-labelledby={interviewCardTabId("question")}
                  data-testid="section-interview-question"
                >
                  <p class="result-text">
                    {controller().strings().card.interview.cleanQuestion}:{" "}
                    {controller().card()?.mode === "interview"
                      ? controller().card().interview.question.cleanQuestion
                      : ""}
                  </p>
                </section>
              </Show>
              <Show when={controller().activeInterviewCardKey() === "signals"}>
                <section
                  class="result-section"
                  id={interviewCardPanelId("signals")}
                  role="tabpanel"
                  aria-labelledby={interviewCardTabId("signals")}
                  data-testid="section-interview-signals"
                >
                  <p class="result-text">
                    {controller().strings().card.interview.mustMention}:{" "}
                    {controller().card()?.mode === "interview"
                      ? joinList(controller().card().interview.signals.mustMention) ||
                        controller().strings().card.interview.notAvailable
                      : ""}
                  </p>
                </section>
              </Show>
              <Show when={controller().activeInterviewCardKey() === "risks"}>
                <section
                  class="result-section"
                  id={interviewCardPanelId("risks")}
                  role="tabpanel"
                  aria-labelledby={interviewCardTabId("risks")}
                  data-testid="section-interview-risks"
                >
                  <p class="result-text">
                    {controller().card()?.mode === "interview"
                      ? controller().card().interview.risks.safeReframe ||
                        controller().strings().card.interview.notAvailable
                      : ""}
                  </p>
                </section>
              </Show>
              <Show when={controller().activeInterviewCardKey() === "followUps"}>
                <section
                  class="result-section"
                  id={interviewCardPanelId("followUps")}
                  role="tabpanel"
                  aria-labelledby={interviewCardTabId("followUps")}
                  data-testid="section-interview-followups"
                >
                  <Show when={controller().card()?.mode === "interview"}>
                    <For
                      each={
                        controller().card()?.mode === "interview"
                          ? controller().card().interview.followUps
                          : []
                      }
                    >
                      {(item) => (
                        <p class="result-text">
                          {item.question} ({item.bridgeAnswer})
                        </p>
                      )}
                    </For>
                  </Show>
                </section>
              </Show>
              <Show when={controller().activeInterviewCardKey() === "clarifier"}>
                <section
                  class="result-section"
                  id={interviewCardPanelId("clarifier")}
                  role="tabpanel"
                  aria-labelledby={interviewCardTabId("clarifier")}
                  data-testid="section-interview-clarifier"
                >
                  <p class="result-text">
                    {controller().card()?.mode === "interview"
                      ? controller().card().interview.clarifier.text ||
                        (controller().card().interview.clarifier as { question?: string })
                          .question ||
                        controller().strings().card.interview.notAvailable
                      : ""}
                  </p>
                </section>
              </Show>
            </>
          }
        >
          <LiveAnswerCard controller={controller()} />
          <hr class="card-section-divider" aria-hidden="true" />
          <InsightStrip controller={controller()} />
        </Show>
      </article>
      <Show when={props.showSidePanel}>
        <WorkspaceSidePanel controller={controller()} />
      </Show>
    </div>
  );
}
