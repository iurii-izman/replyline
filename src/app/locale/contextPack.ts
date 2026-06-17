export const contextPack_ru = {
  panelTitle: "Контекст разговора",
  activeLabel: "Активный контекст",
  newPack: "Новый контекст",
  editPack: "Редактировать",
  deletePack: "Удалить",
  duplicatePack: "Копировать",
  setActive: "Сделать активным",
  save: "Сохранить",
  cancel: "Отмена",
  titleLabel: "Название",
  contentLabel: "Содержание",
  listTitle: "Сохранённые контексты",
  emptyHint: "Создайте контекст, чтобы помощник учитывал ваш бэкграунд и роль в разговоре.",
  emptyWhy:
    "Контекст помогает помощнику понять вашу роль, проект и ограничения — без необходимости объяснять это в каждом вопросе. Достаточно создать один раз и активировать перед нужным разговором.",
  emptyExample:
    "Пример: «Я тимлид команды из 5 разработчиков. Спринт 3 из 4. Ключевой риск: задержка код-ревью из-за отпуска ревьюера.»",
  savedNotice: "Контекст сохранён.",
  charCount: "{{count}} зн.",
  changeCtx: "Сменить",
  editCtx: "Изменить",
  disableCtx: "Отключить",
  manageCtx: "Контекст",
} as const;

export const contextPack_en: typeof contextPack_ru = {
  panelTitle: "Conversation Context",
  activeLabel: "Active Context",
  newPack: "New Context",
  editPack: "Edit",
  deletePack: "Delete",
  duplicatePack: "Duplicate",
  setActive: "Set Active",
  save: "Save",
  cancel: "Cancel",
  titleLabel: "Title",
  contentLabel: "Content",
  listTitle: "Saved Contexts",
  emptyHint:
    "Create a context so the assistant knows your background and role in the conversation.",
  emptyWhy:
    "Context helps the assistant understand your role, project, and constraints — without re-explaining in every question. Create once, activate before the relevant conversation.",
  emptyExample:
    'Example: "I\'m a tech lead for a team of 5 developers. Sprint 3 of 4. Key risk: code review delays due to reviewer vacation."',
  savedNotice: "Context saved.",
  charCount: "{{count}} chars",
  changeCtx: "Change",
  editCtx: "Edit",
  disableCtx: "Disable",
  manageCtx: "Context",
} as const;
