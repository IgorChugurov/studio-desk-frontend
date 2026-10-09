'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../shared/ui/button';
import { Modal } from '../../shared/ui/modal';
import { notify } from '../../shared/ui/toaster';
import { getApi } from '../api/api';
import { useSession } from '../api/session-provider';
import { copy } from '../i18n/language';
import { recordImagesSchema, type HallFile } from './hall-types';

/** Files of a saved hall. Adding, deleting, and reordering do not save the form. */
export function HallGallery({
  hallId,
  images,
  onChange,
  filesBase,
  removeBody,
}: {
  hallId: string;
  images: HallFile[];
  onChange: (images: HallFile[]) => void;
  filesBase?: string;
  removeBody?: string;
}) {
  const session = useSession();
  const texts = copy(session.status === 'signed-in' ? session.language : 'en');
  const input = useRef<HTMLInputElement>(null);
  const dragging = useRef<number | null>(null);
  const [removing, setRemoving] = useState<HallFile | null>(null);
  const [pending, setPending] = useState(false);
  const ordered = images.slice().sort((a, b) => a.index - b.index);
  const filesPath = filesBase ?? `/halls/${hallId}`;
  const removeSentence = removeBody ?? texts.removeFileBody;

  async function add(list: FileList | null) {
    if (!list || list.length === 0) return;
    try {
      const hall = recordImagesSchema.parse(
        await getApi().upload(`${filesPath}/files`, Array.from(list)),
      );
      onChange(hall.images);
    } catch {
      notify.error(texts.somethingWentWrong);
    } finally {
      if (input.current) input.current.value = '';
    }
  }

  async function remove() {
    if (!removing) return;
    setPending(true);
    try {
      const hall = recordImagesSchema.parse(
        await getApi().request(`${filesPath}/files/${removing.id}`, {
          method: 'DELETE',
        }),
      );
      onChange(hall.images);
      notify.success(texts.fileRemoved);
      setRemoving(null);
    } catch {
      notify.error(texts.somethingWentWrong);
    } finally {
      setPending(false);
    }
  }

  async function drop(to: number) {
    const from = dragging.current;
    dragging.current = null;
    if (from === null || from === to) return;
    const next = ordered.slice();
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    const previous = ordered;
    onChange(next.map((file, index) => ({ ...file, index })));
    try {
      const hall = recordImagesSchema.parse(
        await getApi().request(`${filesPath}/files/order`, {
          method: 'PUT',
          body: { fileIds: next.map((file) => file.id) },
        }),
      );
      onChange(hall.images);
    } catch {
      onChange(previous);
      notify.error(texts.somethingWentWrong);
    }
  }

  return (
    <div className="mt-[var(--space-400)] flex max-w-xl flex-col gap-[var(--space-300)]">
      <div className="flex flex-wrap gap-[var(--space-300)]">
        {ordered.map((file, index) => (
          <div
            key={file.id}
            draggable
            onDragStart={() => {
              dragging.current = index;
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => void drop(index)}
            className="relative h-[120px] w-[120px] overflow-hidden rounded-[var(--radius-200)] border border-[var(--border-gray-default)] bg-[var(--background-gray-secondary)]"
          >
            <FilePreview file={file} />
            <Button
              type="button"
              variant="icon-danger"
              size="sm"
              aria-label={texts.removeFileTitle}
              className="absolute top-[var(--space-100)] right-[var(--space-100)]"
              onClick={() => setRemoving(file)}
            >
              <X aria-hidden />
            </Button>
          </div>
        ))}
      </div>
      <div>
        <input
          ref={input}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
          className="hidden"
          onChange={(event) => void add(event.target.files)}
        />
        <Button
          type="button"
          variant="outlined"
          size="md"
          onClick={() => input.current?.click()}
        >
          {texts.addFile}
        </Button>
      </div>
      <Modal
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open && !pending) setRemoving(null);
        }}
        title={texts.removeFileTitle}
        actions={
          <>
            <Button
              type="button"
              variant="outlined"
              size="md"
              disabled={pending}
              onClick={() => setRemoving(null)}
            >
              {texts.fileCancel}
            </Button>
            <Button
              type="button"
              variant="danger"
              size="md"
              loading={pending}
              onClick={() => void remove()}
            >
              {texts.fileRemove}
            </Button>
          </>
        }
      >
        <p>{removeSentence}</p>
      </Modal>
    </div>
  );
}

/** Loads the file with the studio session. A plain address cannot send the token. */
function FilePreview({ file }: { file: HallFile }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let gone = false;
    let objectUrl: string | undefined;
    void getApi()
      .readFile(file.url)
      .then((blob) => {
        if (gone) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => undefined);
    return () => {
      gone = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file.url]);

  if (!src) return null;
  if (file.kind === 'video') {
    return (
      <video
        src={src}
        controls
        muted
        playsInline
        preload="metadata"
        className="h-full w-full object-cover"
      />
    );
  }
  return <img src={src} alt="" className="h-full w-full object-cover" />;
}
