// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AppShell } from './app-shell';

const { session } = vi.hoisted(() => ({
  session: {
    status: 'signed-in' as const,
    email: 'owner@example.com',
    organizationId: 's1',
    organizationName: 'Yoga Space',
    language: 'en' as const,
    sections: ['schedule', 'catalogs'] as string[],
    organizations: [{ id: 's1', name: 'Yoga Space' }],
    config: {
      catalogConfig: { resourceTypes: [] },
      scheduleConfig: {
        audienceEnabled: true,
        formatEnabled: true,
        statuses: ['planned', 'cancelled'],
      },
      billingConfig: { settlementMode: 'subscription' as const },
    },
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock('../api/session-provider', () => ({
  useSession: () => session,
}));

describe('a section the role cannot open', () => {
  afterEach(() => {
    session.sections = ['schedule', 'catalogs'];
    cleanup();
  });

  it('shows the fixed text and does not pretend the section is allowed', () => {
    render(<AppShell section="staff">{null}</AppShell>);
    expect(screen.getByText("You don't have access to this page")).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Staff' })).toBeNull();
  });

  it('does not open Schedule for an accountant', () => {
    session.sections = ['accounting'];
    render(<AppShell section="schedule">{null}</AppShell>);
    expect(screen.getByText("You don't have access to this page")).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Schedule' })).toBeNull();
  });

  it('keeps Catalogs selected', () => {
    render(<AppShell section="catalogs">{null}</AppShell>);
    expect(
      screen
        .getByRole('link', { name: 'Catalogs' })
        .getAttribute('aria-current'),
    ).toBe('page');
  });
});
