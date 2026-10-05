'use client';

import { useState } from 'react';
import { loadPublicEnv } from '../../shared/config/public-env';
import { Button } from '../../shared/ui/button';
import { Modal } from '../../shared/ui/modal';
import { notify } from '../../shared/ui/toaster';
import { requestHandoffCode, setStudioStatus } from './studio-actions';
import type { Studio } from './studio-types';

const FAILED_TEXT = 'Something went wrong. Try again';

/**
 * Deactivate (with a confirmation window), activate, and log in as studio.
 * The list and the studio page use the same actions. `onChanged` gets the
 * studio after its state changed. Show `dialog` once on the page.
 */
export function useStudioActions(onChanged: (studio: Studio) => void) {
  const [target, setTarget] = useState<{ id: string; name: string } | null>(
    null,
  );
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

  function activate(id: string) {
    return run(async () => {
      const studio = await setStudioStatus(id, 'activate');
      notify.success('Studio activated');
      onChanged(studio);
    });
  }

  async function confirmDeactivate() {
    if (!target) return;
    const { id } = target;
    await run(async () => {
      try {
        const studio = await setStudioStatus(id, 'deactivate');
        notify.success('Studio deactivated');
        onChanged(studio);
      } finally {
        setTarget(null);
      }
    });
  }

  /**
   * The new tab opens at once on the click, empty (a tab opened after the
   * answer is blocked as a pop-up), and goes to the studio admin when the
   * code arrives. The code is passed after `#`, never before it.
   */
  function loginAs(id: string) {
    if (pending) return;
    const tab = window.open('', '_blank');
    if (!tab) {
      notify.error(FAILED_TEXT);
      return;
    }
    tab.opener = null;
    return run(async () => {
      try {
        const code = await requestHandoffCode(id);
        tab.location.href = `${loadPublicEnv().studioAdminUrl}#code=${encodeURIComponent(code)}`;
      } catch (error) {
        tab.close();
        throw error;
      }
    });
  }

  const dialog = (
    <Modal
      open={target !== null}
      onOpenChange={(open) => {
        if (!open && !pending) setTarget(null);
      }}
      title="Deactivate studio?"
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
            onClick={() => void confirmDeactivate()}
          >
            Deactivate
          </Button>
        </>
      }
    >
      <p>
        Studio &quot;{target?.name}&quot; will be closed: its owner and staff
        won&apos;t be able to sign in and its public site will be hidden. Data
        is kept. You can activate it again at any time
      </p>
    </Modal>
  );

  return {
    pending,
    activate,
    requestDeactivate: (studio: { id: string; name: string }) =>
      setTarget({ id: studio.id, name: studio.name }),
    loginAs,
    dialog,
  };
}
