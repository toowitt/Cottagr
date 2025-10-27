'use client';

import { useEffect, useMemo, useRef } from 'react';
import { loadQuill, type RichTextValue } from '@/lib/quill';
import 'quill/dist/quill.snow.css';

interface RichTextEditorProps {
  value: RichTextValue;
  onChange: (value: RichTextValue) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<import('quill').default | null>(null);
  const isMountingRef = useRef(false);
  const isInternalUpdate = useRef(false);

  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ indent: '-1' }, { indent: '+1' }],
        ['link'],
        ['clean'],
      ],
    }),
    [],
  );

  useEffect(() => {
    if (quillRef.current || isMountingRef.current) return;
    if (!containerRef.current) return;

    let mounted = true;
    let cleanupHandler: (() => void) | undefined;

    isMountingRef.current = true;

    const mountQuill = async () => {
      const Quill = await loadQuill();
      if (!Quill) return;
      if (!mounted || !containerRef.current) return;

      const mountNode = document.createElement('div');
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(mountNode);

      const quill = new Quill(mountNode, {
        theme: 'snow',
        modules,
        placeholder,
      });

      quillRef.current = quill;

      const initialHtml = value?.html ?? '';
      isInternalUpdate.current = true;
      const initialDelta = quill.clipboard.convert({ html: initialHtml });
      quill.setContents(initialDelta, 'silent');
      isInternalUpdate.current = false;

      const handleChange = () => {
        if (isInternalUpdate.current) return;

        const html = quill.root.innerHTML;
        const text = quill.getText().trim();
        onChange({
          html,
          text,
        });
      };

      quill.on('text-change', handleChange);

      cleanupHandler = () => {
        quill.off('text-change', handleChange);
        quillRef.current = null;
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }
      };
    };

    mountQuill()
      .catch(() => {
        // swallow import errors to avoid crashing the client; UI will stay blank
      })
      .finally(() => {
        isMountingRef.current = false;
      });

    return () => {
      mounted = false;
      cleanupHandler?.();
      isMountingRef.current = false;
    };
  }, [modules, onChange, placeholder, value]);

  useEffect(() => {
    const quill = quillRef.current;
    if (!quill) return;

    const currentHtml = quill.root.innerHTML;
    const nextHtml = value?.html ?? '';

    if (currentHtml === nextHtml) return;

    isInternalUpdate.current = true;
    const selection = quill.getSelection();
    const nextDelta = quill.clipboard.convert({ html: nextHtml });
    quill.setContents(nextDelta, 'silent');
    if (selection) {
      try {
        quill.setSelection(selection);
      } catch {
        // ignore selection errors when editor loses focus
      }
    }
    isInternalUpdate.current = false;
  }, [value]);

  return (
    <div className="rich-text-editor rounded-xl border border-default bg-background">
      <div ref={containerRef} />
    </div>
  );
}
