"use client";

import { useState } from 'react';
import RichTextEditor from '@/components/RichTextEditor';

export default function V2Editor() {
  const [value, setValue] = useState('');

  return (
    <div className="rounded-2xl border border-default bg-background px-4 py-4 shadow-soft">
      <RichTextEditor value={value} onChange={setValue} placeholder="Start drafting…" />
    </div>
  );
}
