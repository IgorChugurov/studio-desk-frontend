// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { notify } from '../../shared/ui/toaster';
import { ApiError } from '../api/api-error';
import { StudioForm } from './studio-form';
import type { StudioValues } from './studio-rules';

vi.mock('../../shared/ui/toaster', () => ({
  notify: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

const loaded: StudioValues = {
  name: 'Yoga Space',
  subdomain: 'yoga-space',
  customDomain: '',
  ownerEmail: 'owner@example.com',
};

const field = (label: RegExp) => screen.getByLabelText(label);
const type = (label: RegExp, value: string) =>
  fireEvent.change(field(label), { target: { value } });

function renderCreate(onSave = vi.fn().mockResolvedValue(undefined)) {
  const onBack = vi.fn();
  render(<StudioForm onSave={onSave} onBack={onBack} />);
  return { onSave, onBack };
}

function renderEdit(onSave = vi.fn().mockResolvedValue(undefined)) {
  const onBack = vi.fn();
  render(
    <StudioForm
      initial={loaded}
      status="active"
      onSave={onSave}
      onBack={onBack}
    />,
  );
  return { onSave, onBack };
}

async function press(name: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });
}

function fillValid() {
  type(/^Name/, 'Yoga Space');
  type(/^Owner e-mail/, 'owner@example.com');
}

beforeEach(() => {
  vi.mocked(notify.error).mockClear();
});

afterEach(cleanup);

describe('StudioForm: new studio', () => {
  it('keeps Save disabled until name, subdomain and owner are filled', () => {
    renderCreate();
    const save = screen.getByRole('button', {
      name: 'Save',
    }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fillValid();
    expect(save.disabled).toBe(false);
  });

  it('proposes the subdomain from the name and shows the address', () => {
    renderCreate();
    type(/^Name/, 'Yoga Space');
    expect((field(/^Subdomain/) as HTMLInputElement).value).toBe('yoga-space');
    expect(
      screen.getByText('yoga-space.studio-desk.axondigital.xyz'),
    ).toBeTruthy();
  });

  it('stops proposing once the subdomain is typed by hand', () => {
    renderCreate();
    type(/^Name/, 'Yoga Space');
    type(/^Subdomain/, 'my-yoga');
    type(/^Name/, 'Other name');
    expect((field(/^Subdomain/) as HTMLInputElement).value).toBe('my-yoga');
  });

  it('does not save and shows the texts when the formats are wrong', async () => {
    const { onSave } = renderCreate();
    type(/^Name/, 'Y');
    type(/^Owner e-mail/, 'nope');
    await press('Save');
    expect(screen.getByText('Use 2–100 characters')).toBeTruthy();
    expect(
      screen.getByText(
        'Use 3–20 lowercase letters, digits or hyphens, starting with a letter',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Enter a valid e-mail address')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves the normalized values, without a confirmation window', async () => {
    const { onSave } = renderCreate();
    fillValid();
    type(/^Subdomain/, 'Yoga-Space');
    type(/^Owner e-mail/, 'Owner@Example.com');
    await press('Save');
    expect(onSave).toHaveBeenCalledWith({
      name: 'Yoga Space',
      subdomain: 'yoga-space',
      customDomain: '',
      ownerEmail: 'owner@example.com',
    });
    expect(screen.queryByText('Confirm changes')).toBeNull();
  });

  it('has no status tag and the Back button works', async () => {
    const { onBack } = renderCreate();
    expect(screen.queryByText('Active')).toBeNull();
    await press('Back');
    expect(onBack).toHaveBeenCalled();
  });
});

describe('StudioForm: server errors', () => {
  async function saveWith(error: unknown) {
    renderCreate(vi.fn().mockRejectedValue(error));
    fillValid();
    await press('Save');
  }

  it('SUBDOMAIN_TAKEN and SUBDOMAIN_RESERVED show at the subdomain', async () => {
    await saveWith(new ApiError(409, 'SUBDOMAIN_TAKEN'));
    expect(screen.getByText('This subdomain is already taken')).toBeTruthy();
    cleanup();
    await saveWith(new ApiError(409, 'SUBDOMAIN_RESERVED'));
    expect(screen.getByText('This subdomain is reserved')).toBeTruthy();
  });

  it('DOMAIN_TAKEN shows at the custom domain', async () => {
    await saveWith(new ApiError(409, 'DOMAIN_TAKEN'));
    expect(
      screen.getByText('This domain is already used by another studio'),
    ).toBeTruthy();
  });

  it('a field error of the API shows at the field it names', async () => {
    await saveWith(
      new ApiError(400, 'VALIDATION_ERROR', [
        { code: 'INVALID_FORMAT', field: 'owner.email' },
      ]),
    );
    expect(screen.getByText('Enter a valid e-mail address')).toBeTruthy();
  });

  it('any other failure shows the generic toast', async () => {
    await saveWith(new ApiError(500, 'INTERNAL_ERROR'));
    expect(notify.error).toHaveBeenCalledWith(
      'Something went wrong. Try again',
    );
  });

  it('the error goes away when the field is edited', async () => {
    await saveWith(new ApiError(409, 'SUBDOMAIN_TAKEN'));
    type(/^Subdomain/, 'yoga-two');
    expect(screen.queryByText('This subdomain is already taken')).toBeNull();
  });
});

describe('StudioForm: editing', () => {
  it('shows the status and the loaded values; Update waits for a change', () => {
    renderEdit();
    expect(screen.getByText('Active')).toBeTruthy();
    expect((field(/^Name/) as HTMLInputElement).value).toBe('Yoga Space');
    expect(
      (screen.getByRole('button', { name: 'Update' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it('does not change the subdomain when the name changes', () => {
    renderEdit();
    type(/^Name/, 'New name');
    expect((field(/^Subdomain/) as HTMLInputElement).value).toBe('yoga-space');
  });

  it('saves a change of the name alone without the window', async () => {
    const { onSave } = renderEdit();
    type(/^Name/, 'New name');
    await press('Update');
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Confirm changes')).toBeNull();
  });

  it('asks to confirm an address change, and only about the address', async () => {
    const { onSave } = renderEdit();
    type(/^Subdomain/, 'yoga-two');
    await press('Update');
    expect(screen.getByText('Confirm changes')).toBeTruthy();
    expect(
      screen.getByText(
        'These changes affect access to the studio and may break existing links or sessions',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText('The old address will stop opening the studio site'),
    ).toBeTruthy();
    expect(screen.queryByText(/will lose access immediately/)).toBeNull();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('asks to confirm an owner change with both e-mails', async () => {
    renderEdit();
    type(/^Owner e-mail/, 'new@example.com');
    await press('Update');
    expect(
      screen.getByText(
        'The current owner owner@example.com will lose access immediately. The new owner will sign in with new@example.com',
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/old address/)).toBeNull();
  });

  it('shows both lines when the address and the owner change', async () => {
    renderEdit();
    type(/^Custom domain/, 'yogaspace.com');
    type(/^Owner e-mail/, 'new@example.com');
    await press('Update');
    expect(screen.getByText(/old address/)).toBeTruthy();
    expect(screen.getByText(/will lose access immediately/)).toBeTruthy();
  });

  it('Cancel closes the window without saving', async () => {
    const { onSave } = renderEdit();
    type(/^Subdomain/, 'yoga-two');
    await press('Update');
    await press('Cancel');
    expect(screen.queryByText('Confirm changes')).toBeNull();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('Save changes saves', async () => {
    const { onSave } = renderEdit();
    type(/^Subdomain/, 'yoga-two');
    await press('Update');
    await press('Save changes');
    expect(onSave).toHaveBeenCalledWith({ ...loaded, subdomain: 'yoga-two' });
  });

  it('a server error closes the window and shows at the field', async () => {
    renderEdit(vi.fn().mockRejectedValue(new ApiError(409, 'SUBDOMAIN_TAKEN')));
    type(/^Subdomain/, 'yoga-two');
    await press('Update');
    await press('Save changes');
    expect(screen.queryByText('Confirm changes')).toBeNull();
    expect(screen.getByText('This subdomain is already taken')).toBeTruthy();
  });
});
