"use client";

import { useEffect, useMemo, useState, type ComponentType } from 'react';
import type { ReactQuillProps } from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const EditorSkeleton = () => (
  <div className="h-48 animate-pulse rounded-2xl border border-gray-800 bg-gray-900/60" />
);

export default function V2Editor() {
  const [Quill, setQuill] = useState<ComponentType<ReactQuillProps> | null>(null);
  const [value, setValue] = useState('');

  useEffect(() => {
    let mounted = true;
    import('react-quill').then((mod) => {
      if (mounted) {
        setQuill(() => mod.default);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

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

  const formats = useMemo(
    () => ['header', 'bold', 'italic', 'underline', 'strike', 'list', 'indent', 'link'],
    [],
  );

  if (!Quill) {
    return <EditorSkeleton />;
  }

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4 text-white">
      <Quill
        theme="snow"
        value={value}
        onChange={setValue}
        modules={modules}
        formats={formats}
      />
    </div>
  );
}
