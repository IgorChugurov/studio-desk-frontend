// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SettingsForm } from './settings-form';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock('../api/session-provider', () => ({
  useSession: () => ({ status: 'signed-in', language: 'en' }),
}));

vi.mock('../api/api', () => ({
  getApi: () => ({
    request: (path: string) => {
      if (path === '/settings') {
        return Promise.resolve({
          language: 'en',
          country: 'SK',
          currency: 'EUR',
          timeZone: 'Europe/Bratislava',
        });
      }
      return Promise.resolve({
        countries: ['SK', 'UA'],
        currencies: ['EUR', 'UAH', 'USD'],
        timeZones: ['Europe/Bratislava', 'Europe/Kyiv'],
      });
    },
  }),
}));

describe('Studio settings', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = () => undefined;
  });

  it('keeps Save disabled until a value changes', async () => {
    render(<SettingsForm />);
    const save = await screen.findByRole('button', { name: 'Save' });
    expect((save as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole('combobox', { name: 'Currency' }));
    fireEvent.click(
      await screen.findByRole('option', { name: 'Hryvnia (UAH)' }),
    );
    expect((save as HTMLButtonElement).disabled).toBe(false);
  });
});
