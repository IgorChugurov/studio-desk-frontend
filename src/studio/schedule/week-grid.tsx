import { ChevronDown, ChevronRight } from 'lucide-react';
import { dayHeading, timeLabel } from './clock';
import { columnHeight, hourTaken, minuteTop, type GridModel } from './model';
import { texts } from './texts';

const BAND = 28;
const HOUR = 48;

/** The week, either days downward or one grid of day columns. */
export function WeekGrid({
  model,
  earlyOpen,
  lateOpen,
  closedDays,
  allowCreate,
  isPast,
  onToggleDay,
  onToggleEarly,
  onToggleLate,
  onCreate,
  onOpenSlot,
  onOpenInactive,
}: {
  model: GridModel;
  earlyOpen: boolean;
  lateOpen: boolean;
  closedDays: string[];
  allowCreate: boolean;
  isPast: (date: string, minutes: number) => boolean;
  onToggleDay: (date: string) => void;
  onToggleEarly: () => void;
  onToggleLate: () => void;
  onCreate: (date: string, minutes: number, columnId: string) => void;
  onOpenSlot: (slotId: string) => void;
  onOpenInactive: (slotIds: string[]) => void;
}) {
  if (model.kind === 'week') {
    return (
      <div data-layout="week" className="flex min-w-0">
        <Hours
          earlyOpen={earlyOpen}
          lateOpen={lateOpen}
          onToggleEarly={onToggleEarly}
          onToggleLate={onToggleLate}
        />
        <div className="flex min-w-0 flex-1 overflow-x-auto border-r border-[var(--border-gray-default)]">
          {model.columns.map((column) => (
            <Column
              key={column.id}
              model={model}
              columnId={column.id}
              date={column.id}
              label={
                column.today ? `${column.label} · ${texts.today}` : column.label
              }
              today={column.today}
              earlyOpen={earlyOpen}
              lateOpen={lateOpen}
              allowCreate={allowCreate}
              isPast={isPast}
              onToggleEarly={onToggleEarly}
              onToggleLate={onToggleLate}
              onCreate={onCreate}
              onOpenSlot={onOpenSlot}
              onOpenInactive={onOpenInactive}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div data-layout="down" className="flex flex-col">
      {model.days.map((day, index) => {
        const closed = closedDays.includes(day.date);
        const label = dayParts(day.heading);
        return (
          <section key={day.date} id={day.today ? 'schedule-today' : undefined}>
            <div
              className={`sticky top-0 z-30 w-full overflow-hidden${index === 0 ? ' rounded-t-[var(--radius-200)]' : ''}${closed ? ' border-b border-[var(--border-gray-secondary)]' : ''}`}
            >
              <button
                type="button"
                aria-expanded={!closed}
                aria-label={
                  day.today ? `${day.heading} ${texts.today}` : day.heading
                }
                className={`flex w-full items-center gap-[var(--space-200)] px-[var(--space-300)] py-[var(--space-200)] text-left font-[family-name:var(--body-font-family)] text-[length:var(--body-sizeM)] text-[var(--text-gray-default)] ${day.today ? 'bg-[var(--background-primary-tertiary)]' : 'bg-[var(--background-gray-tertiary)]'}`}
                onClick={() => onToggleDay(day.date)}
              >
                <span className="flex w-[calc(var(--space-3900)-var(--space-800))] shrink-0">
                  <span>{label.weekday}</span>
                  <span className="ml-auto">{label.date}</span>
                </span>
                {day.today && (
                  <span className="rounded-[var(--radius-100)] bg-[var(--background-primary-default)] px-[var(--space-150)] py-[var(--space-050)] text-[length:var(--body-sizeS)] text-[var(--text-primary-on-primary)]">
                    {texts.today}
                  </span>
                )}
                {closed ? (
                  <ChevronRight
                    aria-hidden
                    className="ml-auto size-4 shrink-0"
                  />
                ) : (
                  <ChevronDown
                    aria-hidden
                    className="ml-auto size-4 shrink-0"
                  />
                )}
              </button>
            </div>
            {!closed && (
              <div className="flex min-w-0 border-b border-[var(--border-gray-default)]">
                <Hours
                  earlyOpen={earlyOpen}
                  lateOpen={lateOpen}
                  onToggleEarly={onToggleEarly}
                  onToggleLate={onToggleLate}
                />
                <div className="flex min-w-0 flex-1 overflow-x-auto border-r border-[var(--border-gray-default)]">
                  {model.columns.map((column) => (
                    <Column
                      key={column.id}
                      model={model}
                      columnId={column.id}
                      date={day.date}
                      label={column.label}
                      today={false}
                      earlyOpen={earlyOpen}
                      lateOpen={lateOpen}
                      allowCreate={allowCreate}
                      isPast={isPast}
                      onToggleEarly={onToggleEarly}
                      onToggleLate={onToggleLate}
                      onCreate={onCreate}
                      onOpenSlot={onOpenSlot}
                      onOpenInactive={onOpenInactive}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Hours({
  earlyOpen,
  lateOpen,
  onToggleEarly,
  onToggleLate,
}: {
  earlyOpen: boolean;
  lateOpen: boolean;
  onToggleEarly: () => void;
  onToggleLate: () => void;
}) {
  return (
    <div className="sticky left-0 z-20 w-14 shrink-0 border-l border-[var(--border-gray-default)] bg-[var(--background-gray-default)]">
      <div className="h-8 border-b border-[var(--border-gray-default)] bg-[var(--background-gray-secondary)]" />
      <Band
        label={texts.earlyShort}
        name={texts.earlyBand}
        open={earlyOpen}
        onToggle={onToggleEarly}
      />
      {earlyOpen &&
        range(0, 8).map((hour) => <HourLabel key={hour} hour={hour} />)}
      {range(8, 22).map((hour) => (
        <HourLabel key={hour} hour={hour} />
      ))}
      <Band
        label={texts.lateShort}
        name={texts.lateBand}
        open={lateOpen}
        onToggle={onToggleLate}
      />
      {lateOpen &&
        range(22, 24).map((hour) => <HourLabel key={hour} hour={hour} />)}
    </div>
  );
}

function Column({
  model,
  columnId,
  date,
  label,
  today,
  earlyOpen,
  lateOpen,
  allowCreate,
  isPast,
  onToggleEarly,
  onToggleLate,
  onCreate,
  onOpenSlot,
  onOpenInactive,
}: {
  model: GridModel;
  columnId: string;
  date: string;
  label: string;
  today: boolean;
  earlyOpen: boolean;
  lateOpen: boolean;
  allowCreate: boolean;
  isPast: (date: string, minutes: number) => boolean;
  onToggleEarly: () => void;
  onToggleLate: () => void;
  onCreate: (date: string, minutes: number, columnId: string) => void;
  onOpenSlot: (slotId: string) => void;
  onOpenInactive: (slotIds: string[]) => void;
}) {
  const cards = model.cards.filter(
    (card) => card.columnId === columnId && card.date === date,
  );
  const strips = model.strips.filter(
    (strip) => strip.columnId === columnId && strip.date === date,
  );
  return (
    <div
      className="relative min-w-36 flex-1 border-l border-[var(--border-gray-default)]"
      data-today={today ? 'true' : undefined}
    >
      <div
        className={`flex h-8 items-center border-b border-[var(--border-gray-default)] bg-[var(--background-gray-secondary)] px-[var(--space-200)] font-[family-name:var(--body-font-family)] text-[length:var(--body-sizeS)] text-[var(--text-gray-default)] ${today ? 'text-[var(--text-primary-default)]' : ''}`}
      >
        {label}
      </div>
      <div
        className="relative"
        style={{ height: columnHeight(earlyOpen, lateOpen) }}
      >
        <Band
          name={texts.earlyBand}
          open={earlyOpen}
          onToggle={onToggleEarly}
        />
        {earlyOpen &&
          range(0, 8).map((hour) => (
            <HourCell
              key={hour}
              hour={hour}
              date={date}
              columnId={columnId}
              label={model.kind === 'down' ? label : ''}
              taken={hourTaken(cards, strips, columnId, date, hour)}
              allowCreate={allowCreate}
              past={isPast(date, hour * 60)}
              onCreate={onCreate}
            />
          ))}
        {range(8, 22).map((hour) => (
          <HourCell
            key={hour}
            hour={hour}
            date={date}
            columnId={columnId}
            label={model.kind === 'down' ? label : ''}
            taken={hourTaken(cards, strips, columnId, date, hour)}
            allowCreate={allowCreate}
            past={isPast(date, hour * 60)}
            onCreate={onCreate}
          />
        ))}
        <Band name={texts.lateBand} open={lateOpen} onToggle={onToggleLate} />
        {lateOpen &&
          range(22, 24).map((hour) => (
            <HourCell
              key={hour}
              hour={hour}
              date={date}
              columnId={columnId}
              label={model.kind === 'down' ? label : ''}
              taken={hourTaken(cards, strips, columnId, date, hour)}
              allowCreate={allowCreate}
              past={isPast(date, hour * 60)}
              onCreate={onCreate}
            />
          ))}
        {cards.map((card) => (
          <button
            key={card.key}
            type="button"
            className={`absolute inset-x-1 z-10 overflow-hidden rounded-[var(--radius-200)] border px-[var(--space-100)] py-px text-left font-[family-name:var(--body-font-family)] text-[length:var(--body-sizeS)] leading-4 ${
              card.neutral || card.past || card.listIds
                ? 'border-[var(--border-gray-default)] bg-[var(--background-gray-secondary)] text-[var(--text-gray-secondary)]'
                : 'border-[var(--border-primary-default)] bg-[var(--background-primary-tertiary)] text-[var(--text-gray-default)]'
            }`}
            style={{
              top: minuteTop(card.startMin, earlyOpen, lateOpen),
              height: Math.max(
                minuteTop(card.endMin, earlyOpen, lateOpen) -
                  minuteTop(card.startMin, earlyOpen, lateOpen),
                20,
              ),
            }}
            onClick={() =>
              card.listIds
                ? onOpenInactive(card.listIds)
                : onOpenSlot(card.slotId)
            }
          >
            <span className="block truncate">
              {card.title} {card.lines[0]}
            </span>
            {card.lines.length > 1 && (
              <span className="block truncate">
                {card.lines.slice(1).join(' · ')}
              </span>
            )}
          </button>
        ))}
        {strips.map((strip) => (
          <button
            key={strip.key}
            type="button"
            aria-label={strip.label}
            className="absolute right-0 z-10 w-2 rounded-[var(--radius-100)] bg-[var(--border-gray-default)]"
            style={{
              top: minuteTop(strip.startMin, earlyOpen, lateOpen),
              height: Math.max(
                minuteTop(strip.endMin, earlyOpen, lateOpen) -
                  minuteTop(strip.startMin, earlyOpen, lateOpen),
                12,
              ),
            }}
            onClick={() => onOpenInactive(strip.slotIds)}
          />
        ))}
      </div>
    </div>
  );
}

function Band({
  label,
  name,
  open,
  onToggle,
}: {
  label?: string;
  name: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-label={name}
      className="block w-full overflow-hidden border-t border-[var(--border-gray-default)] bg-[var(--background-gray-secondary)] px-[var(--space-100)] text-left font-[family-name:var(--body-font-family)] text-[length:var(--body-sizeS)] whitespace-nowrap text-[var(--text-gray-secondary)]"
      style={{ height: BAND }}
      onClick={onToggle}
    >
      {label}
    </button>
  );
}

function HourLabel({ hour }: { hour: number }) {
  return (
    <div
      className="flex items-center justify-end border-t border-[var(--border-gray-default)] pr-[var(--space-100)] text-right font-[family-name:var(--body-font-family)] text-[length:var(--body-sizeS)] leading-none text-[var(--text-gray-secondary)]"
      style={{ height: HOUR }}
    >
      {timeLabel(hour * 60)}
    </div>
  );
}

function HourCell({
  hour,
  date,
  columnId,
  label,
  taken,
  allowCreate,
  past,
  onCreate,
}: {
  hour: number;
  date: string;
  columnId: string;
  label: string;
  taken: boolean;
  allowCreate: boolean;
  past: boolean;
  onCreate: (date: string, minutes: number, columnId: string) => void;
}) {
  const open = allowCreate && !taken && !past;
  return (
    <div
      className="border-t border-[var(--border-gray-default)]"
      style={{ height: HOUR }}
    >
      {open && (
        <button
          type="button"
          aria-label={`${dayHeading(date)} ${timeLabel(hour * 60)}${label ? ` ${label}` : ''}`}
          className="h-full w-full hover:bg-[var(--background-gray-secondary)]"
          onClick={() => onCreate(date, hour * 60, columnId)}
        />
      )}
    </div>
  );
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from }, (_, index) => from + index);
}

function dayParts(heading: string): { weekday: string; date: string } {
  const split = heading.lastIndexOf(' ');
  return {
    weekday: heading.slice(0, split),
    date: heading.slice(split + 1),
  };
}
