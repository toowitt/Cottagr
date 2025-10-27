"use client";

import { useState } from 'react';
import RichTextEditor from '@/components/RichTextEditor';
import type { RichTextValue } from '@/lib/quill';

export default function V2Editor() {
  const [value, setValue] = useState<RichTextValue>({ html: '', text: '' });

  return (
    <div className="rounded-2xl border border-default bg-background px-4 py-4 shadow-soft">
      <RichTextEditor value={value} onChange={setValue} placeholder="Start drafting…" />
    </div>
  );
}
