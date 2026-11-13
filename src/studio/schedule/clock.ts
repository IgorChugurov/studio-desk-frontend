/** Wall-clock dates and times. A class is stored in the hall's zone and shown in the view zone. */

export interface Wall {
  date: string;
  time: string;
}

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function wallOf(
  instant: Date,
  timeZone: string,
): Wall & { weekday: string } {
  const bag: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    weekday: 'long',
  }).formatToParts(instant)) {
    if (part.type !== 'literal') bag[part.type] = part.value;
  }
  let hour = Number(bag.hour);
  let day = Number(bag.day);
  let month = Number(bag.month);
  let year = Number(bag.year);
  if (hour === 24) {
    hour = 0;
    const next = new Date(Date.UTC(year, month - 1, day) + 86_400_000);
    year = next.getUTCFullYear();
    month = next.getUTCMonth() + 1;
    day = next.getUTCDate();
  }
  return {
    date: `${year}-${pad(month)}-${pad(day)}`,
    time: `${pad(hour)}:${bag.minute}`,
    weekday: bag.weekday ?? 'Monday',
  };
}

/** The instant of a wall clock in `timeZone`. */
export function instantOf(date: string, time: string, timeZone: string): Date {
  const [year, month, day] = dateNumbers(date);
  const [hour, minute] = timeNumbers(time);
  let utc = Date.UTC(year, month - 1, day, hour, minute);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const wall = wallOf(new Date(utc), timeZone);
    const [gotYear, gotMonth, gotDay] = dateNumbers(wall.date);
    const [gotHour, gotMinute] = timeNumbers(wall.time);
    const got = Date.UTC(gotYear, gotMonth - 1, gotDay, gotHour, gotMinute);
    const want = Date.UTC(year, month - 1, day, hour, minute);
    if (got === want) return new Date(utc);
    utc -= got - want;
  }
  return new Date(utc);
}

/** `date` and `time` read in `fromZone`, written in `toZone`. */
export function clockInZone(
  date: string,
  time: string,
  fromZone: string,
  toZone: string,
): Wall {
  const wall = wallOf(instantOf(date, time, fromZone), toZone);
  return { date: wall.date, time: wall.time };
}

export function todayIn(timeZone: string, now = new Date()): string {
  return wallOf(now, timeZone).date;
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = dateNumbers(date);
  const next = new Date(Date.UTC(year, month - 1, day) + days * 86_400_000);
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

/** Monday of the civil week that contains `date`. */
export function mondayOf(date: string): string {
  const [year, month, day] = dateNumbers(date);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return addDays(date, weekday === 0 ? -6 : 1 - weekday);
}

export function weekDates(monday: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

export function weekdayName(date: string): string {
  const [year, month, day] = dateNumbers(date);
  return (
    WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()] ?? 'Sunday'
  );
}

export function dayHeading(date: string): string {
  const [, month, day] = date.split('-');
  return `${weekdayName(date)} ${day}.${month}`;
}

export function weekLabel(monday: string): string {
  return `${dotted(monday)}–${dotted(addDays(monday, 6))}`;
}

function dotted(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}.${month}.${year}`;
}

export function minutesOf(time: string): number {
  const [hour, minute] = timeNumbers(time);
  return hour * 60 + minute;
}

export function dateNumbers(date: string): [number, number, number] {
  const [year, month, day] = date.split('-');
  return [Number(year), Number(month), Number(day)];
}

function timeNumbers(time: string): [number, number] {
  const [hour, minute] = time.split(':');
  return [Number(hour), Number(minute)];
}

export function hasStarted(
  date: string,
  time: string,
  timeZone: string,
  now = new Date(),
): boolean {
  return instantOf(date, time, timeZone).getTime() <= now.getTime();
}

export function endsAfterMidnight(
  time: string,
  durationMinutes: number,
): boolean {
  return minutesOf(time) + durationMinutes > 24 * 60;
}

export function timeLabel(minutes: number): string {
  const capped = Math.min(minutes, 24 * 60);
  return `${pad(Math.floor(capped / 60))}:${pad(capped % 60)}`;
}
