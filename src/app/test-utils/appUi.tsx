import { fireEvent, render, screen, waitFor } from "@solidjs/testing-library";

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

export async function enableCompactInterviewMode() {
  await openSettingsPanel();
  openSettingsSection(/Горячая клавиша/i);
  fireEvent.click(await screen.findByLabelText("Компактный режим интервью"));
  fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
  fireEvent.click(await screen.findByRole("button", { name: "Назад" }));
  await waitFor(() => expect(screen.getByTestId("main-surface")).toBeTruthy());
}

export async function triggerAnalysisReady(mock: MockPlatform): Promise<void> {
  await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
  await mock.emitShortcut({ state: "Pressed" });
  await mock.emitShortcut({ state: "Released" });
}
