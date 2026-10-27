/** Fixed texts from schedule.md. Inserted as written, in English. */

export const texts = {
  schedule: 'Schedule',
  templates: 'Templates',
  all: 'All',
  timeZone: 'Time zone',
  previousWeek: 'Previous week',
  nextWeek: 'Next week',
  earlyBand: '00:00–08:00',
  lateBand: '22:00–24:00',
  earlyShort: '00–08',
  lateShort: '22–24',
  today: 'Today',
  service: 'Service',
  blockTime: 'Block time',
  blockedTime: 'Blocked time',
  date: 'Date',
  weekday: 'Day',
  startTime: 'Start time',
  duration: 'Duration',
  audience: 'Audience & places',
  group: 'Group',
  onePersonOption: 'One person',
  onePerson: 'one person',
  places: 'Places',
  format: 'Format',
  offline: 'Offline',
  offlineAndOnline: 'Offline and online',
  onlineOnly: 'Online only',
  blocksAll: 'Block entire organization',
  allResources: 'All resources',
  note: 'Reason / Note',
  status: 'Status',
  planned: 'Planned',
  confirmed: 'Confirmed',
  inProgress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  noShow: 'No-show',
  save: 'Save',
  saveAnyway: 'Save anyway',
  back: 'Back',
  cancelSlot: 'Cancel slot',
  replace: 'Replace',
  delete: 'Delete',
  restore: 'Restore',
  cancelTitle: 'Cancel slot?',
  cancelBody: 'The slot stays in the schedule marked as cancelled',
  deleteTitle: 'Delete slot?',
  deleteBody: 'The slot will be removed from the schedule',
  selectDate: 'Select a date',
  selectPlace: 'Select a place',
  step: 'Enter a time in steps of 5 minutes',
  durationError: 'Enter a duration from 5 to 1440 minutes in steps of 5',
  placesError: 'Enter the number of places',
  midnight: 'A slot must end by midnight',
  added: 'Slot added',
  updated: 'Slot updated',
  slotCancelled: 'Slot cancelled',
  slotRestored: 'Slot restored',
  slotDeleted: 'Slot deleted',
  slotReplaced: 'Slot replaced',
  failed: 'Something went wrong. Try again',
  search: 'Search',
  noOptions: 'No options found',
  allSelected: 'All selected',
  applyTemplate: 'Apply template',
  clearWeeks: 'Clear weeks',
  replaceWithTemplate: 'Replace with template',
  conflicts: 'Conflicts',
  keepExisting: 'Keep existing',
  applyNew: 'Apply new',
  templatePlaces: 'Template places',
  allPlaces: 'All places',
  newTemplate: 'New template',
  templateAdded: 'Template added',
  templateUpdated: 'Template updated',
  templateDeleted: 'Template deleted',
  deleteTemplateTitle: 'Delete template?',
  deleteTemplateBody: 'Slots already on the schedule stay as they are',
  noTemplates: 'No templates yet',
  noTemplatesFound: 'No templates found',
  searchHint: "Change the search term to find what you're looking for.",
  resetSearch: 'Reset search',
  name: 'Name',
  enterName: 'Enter a name',
  addTemplate: 'Add template',
  edit: 'Edit',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
} as const;

export function formatLabel(
  format: 'offline' | 'offline_and_online' | 'online_only',
): string {
  if (format === 'offline_and_online') return texts.offlineAndOnline;
  if (format === 'online_only') return texts.onlineOnly;
  return texts.offline;
}

export function statusLabel(status: string): string {
  if (status === 'confirmed') return texts.confirmed;
  if (status === 'in_progress') return texts.inProgress;
  if (status === 'completed') return texts.completed;
  if (status === 'cancelled') return texts.cancelled;
  if (status === 'no_show') return texts.noShow;
  return texts.planned;
}

export function busySentence(input: {
  resourceName?: string;
  title?: string;
  start: string;
  end: string;
}): string | null {
  if (!input.resourceName || !input.title) return null;
  return `${input.resourceName} is busy at this time: ${input.title} ${input.start}–${input.end}`;
}

export function selectResource(singular: string): string {
  return `Select a ${singular}`;
}

export function weekdayLabel(weekday: string): string {
  if (weekday === 'monday') return texts.monday;
  if (weekday === 'tuesday') return texts.tuesday;
  if (weekday === 'wednesday') return texts.wednesday;
  if (weekday === 'thursday') return texts.thursday;
  if (weekday === 'friday') return texts.friday;
  if (weekday === 'saturday') return texts.saturday;
  return texts.sunday;
}
