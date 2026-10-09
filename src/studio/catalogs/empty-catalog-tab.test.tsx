// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { EmptyCatalogTab } from './empty-catalog-tab';

vi.mock('../api/session-provider', () => ({
  useSession: () => ({ status: 'signed-in', language: 'en' }),
}));

describe('Empty catalog tabs', () => {
  afterEach(() => cleanup());

  it('renders Trainers and Class types with nothing else', () => {
    const { unmount } = render(<EmptyCatalogTab tab="trainers" />);
    expect(
      screen
        .getByRole('link', { name: 'Trainers' })
        .getAttribute('aria-current'),
    ).toBe('page');
    expect(screen.queryByRole('button', { name: 'Add hall' })).toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
    unmount();

    render(<EmptyCatalogTab tab="class-types" />);
    expect(
      screen
        .getByRole('link', { name: 'Class types' })
        .getAttribute('aria-current'),
    ).toBe('page');
    expect(screen.queryByText('No halls yet')).toBeNull();
  });
});
