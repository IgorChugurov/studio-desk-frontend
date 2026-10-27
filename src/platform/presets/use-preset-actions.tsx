'use client';

import { useState } from 'react';
import { Button } from '../../shared/ui/button';
import { Modal } from '../../shared/ui/modal';
import { notify } from '../../shared/ui/toaster';
import { getApi } from '../api/api';
import type { Preset } from './preset-types';

const FAILED_TEXT = 'Something went wrong. Try again';

/** Duplicate and delete. Show `dialog` once on the page. */
export function usePresetActions(onChanged: () => void) {
  const [target, setTarget] = useState<Preset | null>(null);
  const [pending, setPending] = useState(false);

  async function run(task: () => Promise<void>) {
    if (pending) return;
    setPending(true);
    try {
      await task();
    } catch {
      notify.error(FAILED_TEXT);
    } finally {
      setPending(false);
    }
  }

  function duplicate(preset: Preset) {
    return run(async () => {
      await getApi().request(`/presets/${preset.id}/duplicate`, {
        method: 'POST',
      });
      notify.success('Preset duplicated');
      onChanged();
    });
  }

  async function confirmDelete() {
    if (!target) return;
    const { id } = target;
    await run(async () => {
      try {
        await getApi().request(`/presets/${id}`, { method: 'DELETE' });
        notify.success('Preset deleted');
        onChanged();
      } finally {
        setTarget(null);
      }
    });
  }

  const dialog = (
    <Modal
      open={target !== null}
      onOpenChange={(open) => {
        if (!open && !pending) setTarget(null);
      }}
      title="Delete preset?"
      actions={
        <>
          <Button
            type="button"
            variant="outlined"
            size="md"
            className="w-full sm:w-auto"
            disabled={pending}
            onClick={() => setTarget(null)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="md"
            className="w-full sm:w-auto"
            loading={pending}
            onClick={() => void confirmDelete()}
          >
            Delete
          </Button>
        </>
      }
    >
      <p>
        Preset &quot;{target?.name}&quot; will be deleted. Existing
        organizations created from it will keep their configuration
      </p>
    </Modal>
  );

  return { pending, duplicate, requestDelete: setTarget, dialog };
}
