import { fireEvent, screen, waitFor, within } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";

import { createMockPlatform, uiStateFixtures } from "./test-utils/mockPlatform";
import {
  fillCandidatePackSourceInputs,
  openCandidatePackStudio,
  renderApp,
} from "./test-utils/appUi";

describe("candidate pack studio integration", () => {
  it("renders empty fixture and disabled draft save before prepare", async () => {
    const mock = createMockPlatform(uiStateFixtures.candidatePackEmpty());
    renderApp(mock);
    await openCandidatePackStudio();

    expect(screen.getByTestId("candidate-pack-status-banner").textContent).toContain("Пусто");
    expect(screen.getByTestId("candidate-pack-stepper-item-1").className).toContain("is-current");
    expect(screen.getByTestId("candidate-pack-empty-state")).toBeTruthy();
    expect(screen.getByText("Профиль ещё не подготовлен")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Сохранить черновик профиля" }).hasAttribute("disabled"),
    ).toBe(true);
    expect(screen.getByRole("button", { name: "Очистить профиль" }).className).toContain(
      "btn-danger",
    );
  });

  it("prepares preview, saves prepared profile, and keeps saved-state signals", async () => {
    const mock = createMockPlatform({
      candidatePackStatus: { exists: true, factCount: 9, weakFactCount: 2 },
    });
    renderApp(mock);
    await openCandidatePackStudio();

    await fillCandidatePackSourceInputs({
      resume: "resume raw text",
      jobDescription: "jd raw text",
    });
    fireEvent.click(screen.getByRole("button", { name: "Подготовить профиль" }));
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((call) => call[0] === "prepare_candidate_pack")).toBe(
        true,
      ),
    );
    expect(screen.getByTestId("candidate-pack-quality-card")).toBeTruthy();
    expect(screen.getByText("Слабые факты: 1")).toBeTruthy();
    expect(
      mock.invoke.mock.calls.some((call) => call[0] === "save_prepared_candidate_pack"),
    ).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Сохранить профиль" }));
    await waitFor(() =>
      expect(
        mock.invoke.mock.calls.some((call) => call[0] === "save_prepared_candidate_pack"),
      ).toBe(true),
    );
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((call) => call[0] === "save_candidate_pack")).toBe(true),
    );
    expect(screen.getByTestId("candidate-pack-preview").textContent).toContain("Слабые факты:");
  });

  it("opens styled accordions and wires footer actions for clear and back", async () => {
    const mock = createMockPlatform();
    renderApp(mock);
    await openCandidatePackStudio();

    expect(screen.getByRole("heading", { name: /Студия профиля кандидата/i })).toBeTruthy();
    expect(screen.getByTestId("studio-accordion-root")).toBeTruthy();

    const roleCompany = screen.getByTestId("studio-accordion-role-company");
    fireEvent.click(within(roleCompany).getByRole("button"));
    expect(within(roleCompany).getByLabelText("Целевая роль")).toBeTruthy();

    const footer = screen.getByTestId("candidate-pack-studio-footer");
    expect(footer.className).toContain("app-sticky-footer");
    expect(within(footer).getByRole("button", { name: "Подготовить профиль" })).toBeTruthy();
    expect(within(footer).getByRole("button", { name: "Назад в настройки" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Очистить профиль" }));
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((call) => call[0] === "clear_candidate_pack")).toBe(
        true,
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Назад в настройки" }));
    await waitFor(() => expect(screen.getByTestId("settings-surface")).toBeTruthy());
  });
});
