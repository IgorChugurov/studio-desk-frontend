// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppShell } from './app-shell';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock('../api/session-provider', () => ({
  useSession: () => ({
    status: 'signed-in',
    email: 'owner@example.com',
    studioId: 's1',
    studioName: 'Yoga Space',
    language: 'en',
    sections: ['schedule'],
    studios: [{ id: 's1', name: 'Yoga Space' }],
  }),
}));

describe('a section the role cannot open', () => {
  it('shows the fixed text and does not pretend the section is allowed', () => {
    render(<AppShell section="staff">{null}</AppShell>);
    expect(
      screen.getByText("You don't have access to this page"),
    ).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Staff' })).toBeNull();
  });
});
