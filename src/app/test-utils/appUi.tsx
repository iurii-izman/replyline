import { fireEvent, render, screen, waitFor, within } from "@solidjs/testing-library";

import App from "../../App";
import type { MockPlatform } from "./mockPlatform";

export function renderApp(mock: MockPlatform) {
  return render(() => <App platform={mock.platform} />);
}

export async function openSettingsPanel() {
  fireEvent.click(await screen.findByTitle("Настройки"));
  await waitFor(() => expect(screen.getByTestId("settings-surface")).toBeTruthy());
}

export function openSettingsSection(name: string | RegExp) {
  fireEvent.click(screen.getByRole("tab", { name }));
}

export async function openCandidatePackStudio() {
  await openSettingsPanel();
  openSettingsSection(/Профиль кандидата/i);
  await waitFor(() => expect(screen.getByTestId("settings-section-candidate-pack")).toBeTruthy());
  fireEvent.click(screen.getByRole("button", { name: "Открыть студию профиля кандидата" }));
  await waitFor(() => expect(screen.getByTestId("candidate-pack-studio")).toBeTruthy());
}

export async function enableCompactInterviewMode() {
  await openSettingsPanel();
  openSettingsSection(/Горячая клавиша/i);
  fireEvent.click(await screen.findByLabelText("Компактный режим интервью"));
  fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
  fireEvent.click(await screen.findByRole("button", { name: "Назад" }));
  await waitFor(() => expect(screen.getByTestId("main-surface")).toBeTruthy());
}

export async function fillCandidatePackSourceInputs(input: {
  resume?: string;
  jobDescription?: string;
  companyValues?: string;
}) {
  const section = screen.getByTestId("candidate-pack-ai-section");
  const textareas = within(section).getAllByRole("textbox");
  if (input.resume !== undefined) {
    fireEvent.input(textareas[0], { target: { value: input.resume } });
  }
  if (input.jobDescription !== undefined) {
    fireEvent.input(textareas[1], { target: { value: input.jobDescription } });
  }
  if (input.companyValues !== undefined) {
    fireEvent.input(textareas[2], { target: { value: input.companyValues } });
  }
}

export async function triggerAnalysisReady(mock: MockPlatform): Promise<void> {
  await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
  await mock.emitShortcut({ state: "Pressed" });
  await mock.emitShortcut({ state: "Released" });
}
