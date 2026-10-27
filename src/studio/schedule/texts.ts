/** Fixed texts from schedule.md. Inserted as written, in English. */

export const texts = {
  halls: 'Halls',
  trainers: 'Trainers',
  all: 'All',
  hall: 'Hall',
  trainer: 'Trainer',
  classType: 'Class type',
  timeZone: 'Time zone',
  previousWeek: 'Previous week',
  nextWeek: 'Next week',
  earlyBand: '00:00–08:00',
  lateBand: '22:00–24:00',
  earlyShort: '00–08',
  lateShort: '22–24',
  today: 'Today',
  newClass: 'New class',
  date: 'Date',
  startTime: 'Start time',
  duration: 'Duration',
  trainersField: 'Trainers',
  audience: 'Group / One person',
  group: 'Group',
  onePersonOption: 'One person',
  onePerson: 'one person',
  places: 'Places',
  format: 'Format',
  offline: 'Offline',
  offlineAndOnline: 'Offline and online',
  onlineOnly: 'Online only',
  save: 'Save',
  back: 'Back',
  cancelClass: 'Cancel class',
  replace: 'Replace',
  delete: 'Delete',
  restore: 'Restore',
  cancelled: 'Cancelled',
  cancelTitle: 'Cancel class?',
  cancelBody: 'The class stays in the schedule marked as cancelled',
  deleteTitle: 'Delete class?',
  deleteBody: 'The class will be removed from the schedule',
  selectDate: 'Select a date',
  selectHall: 'Select a hall',
  selectClassType: 'Select a class type',
  selectTrainer: 'Select at least one trainer',
  step: 'Enter a time in steps of 5 minutes',
  durationError: 'Enter a duration from 5 to 240 minutes in steps of 5',
  placesError: 'Enter the number of places',
  midnight: 'A class must end by midnight',
  added: 'Class added',
  updated: 'Class updated',
  classCancelled: 'Class cancelled',
  classRestored: 'Class restored',
  classDeleted: 'Class deleted',
  classReplaced: 'Class replaced',
  failed: 'Something went wrong. Try again',
  search: 'Search',
  noOptions: 'No options found',
  allSelected: 'All selected',
} as const;

export function formatLabel(
  format: 'offline' | 'offline_and_online' | 'online_only',
): string {
  if (format === 'offline_and_online') return texts.offlineAndOnline;
  if (format === 'online_only') return texts.onlineOnly;
  return texts.offline;
}

export function hallBusy(
  classType: string,
  start: string,
  end: string,
): string {
  return `The hall is busy at this time: ${classType} ${start}–${end}`;
}

export function trainerBusy(
  trainer: string,
  hall: string,
  start: string,
  end: string,
): string {
  return `${trainer} has another class at this time: ${hall} ${start}–${end}`;
}
