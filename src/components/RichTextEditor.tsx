'use client';

import dynamic from 'next/dynamic';
import { useMemo, type ComponentType } from 'react';
import type { ReactQuillProps } from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = dynamic(async () => {
  const mod = await import('react-quill');
  return mod.default;
}, {
  ssr: false,
  // simple skeleton placeholder
  loading: () => <div className="min-h-[10rem] animate-pulse rounded-xl bg-muted" />,
}) as ComponentType<ReactQuillProps>;

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
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

  return (
    <div className="rich-text-editor">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        className="rounded-xl bg-gray-800 text-white"
      />
    </div>
  );
}
