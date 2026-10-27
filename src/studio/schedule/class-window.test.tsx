// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ClassWindow } from './class-window';
import type { Draft } from './model';

const draft: Draft = {
  date: '2026-10-24',
  time: '09:00',
  hallId: 'green',
  classTypeId: 'dance',
  duration: '60',
  trainerIds: [],
  audience: 'group',
  format: 'offline',
  places: '12',
};

describe('Class window trainers', () => {
  beforeAll(() => {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    Element.prototype.scrollIntoView = () => {};
  });

  afterEach(() => cleanup());

  it('adds the trainer from the open list', () => {
    const submitted: Draft[] = [];
    render(
      <ClassWindow
        mode="new"
        initial={draft}
        halls={[
          {
            id: 'green',
            name: 'Green',
            type: 'ordinary',
            timeZone: 'Europe/Bratislava',
          },
        ]}
        trainers={[{ id: 'kate', name: 'Kate' }]}
        classTypes={[
          { id: 'dance', name: 'Dance', defaultDuration: 60, trainerIds: [] },
        ]}
        errors={{}}
        alert={null}
        pending={false}
        allowActions
        onEdit={vi.fn()}
        onSubmit={(next) => submitted.push(next)}
        onBack={vi.fn()}
        onCancelClass={vi.fn()}
        onReplace={vi.fn()}
        onDelete={vi.fn()}
        onRestore={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Trainers' }));
    fireEvent.mouseDown(screen.getByRole('option', { name: 'Kate' }));
    expect(screen.getByRole('button', { name: 'Remove Kate' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(submitted[0]?.trainerIds).toEqual(['kate']);
  });
});
