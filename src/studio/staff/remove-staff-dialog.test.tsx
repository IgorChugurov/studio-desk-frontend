// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { RemoveStaffDialog } from './remove-staff-dialog';
import { copy } from '../i18n/language';

describe('Remove staff member', () => {
  it('shows the fixed warning and removes only after confirmation', () => {
    const onRemove = vi.fn();
    const texts = copy('en');
    render(
      <RemoveStaffDialog
        email="olga@example.com"
        texts={texts}
        pending={false}
        onCancel={() => undefined}
        onRemove={onRemove}
      />,
    );
    expect(
      screen.getByText(
        'olga@example.com will lose access to the studio immediately. You can add this e-mail again at any time',
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onRemove).toHaveBeenCalledOnce();
  });
});
