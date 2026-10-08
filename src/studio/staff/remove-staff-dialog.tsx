'use client';

import { Button } from '../../shared/ui/button';
import { Modal } from '../../shared/ui/modal';
import type { Copy } from '../i18n/language';

/** Confirmation before a staff member is removed from the studio. */
export function RemoveStaffDialog({
  email,
  texts,
  pending,
  onCancel,
  onRemove,
}: {
  email: string | null;
  texts: Copy;
  pending: boolean;
  onCancel: () => void;
  onRemove: () => void;
}) {
  return (
    <Modal
      open={email !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      title={texts.removeTitle}
      actions={
        <>
          <Button type="button" variant="outlined" size="md" onClick={onCancel}>
            {texts.cancel}
          </Button>
          <Button
            type="button"
            variant="danger"
            size="md"
            loading={pending}
            onClick={onRemove}
          >
            {texts.remove}
          </Button>
        </>
      }
    >
      <p>{texts.removeBody.replace('{e-mail}', email ?? '')}</p>
    </Modal>
  );
}
