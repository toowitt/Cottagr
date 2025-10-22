'use client';

import { useState, useTransition } from 'react';
import RichTextEditor from './RichTextEditor';
import { createArticleAction } from '@/app/admin/blog/actions';

interface BlogArticleFormProps {
  categories: Array<{ id: number; name: string }>;
}

export default function BlogArticleForm({ categories }: BlogArticleFormProps) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (status: string) => {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('slug', slug);
    formData.append('excerpt', excerpt);
    formData.append('content', content);
    formData.append('categoryId', categoryId);
    formData.append('status', status);

    startTransition(async () => {
      await createArticleAction(formData);
      setTitle('');
      setSlug('');
      setExcerpt('');
      setContent('');
      setCategoryId('');
    });
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (!slug) {
      setSlug(generateSlug(newTitle));
    }
  };

  return (
    <div className="grid gap-3">
      <input
        type="text"
        value={title}
        onChange={(e) => handleTitleChange(e.target.value)}
        required
        placeholder="Article title"
        className="rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
      />
      <input
        type="text"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        required
        placeholder="URL slug (e.g., cottage-inheritance-guide)"
        className="rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
      />
      <select
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        className="rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
      >
        <option value="">No category</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>
      <textarea
        value={excerpt}
        onChange={(e) => setExcerpt(e.target.value)}
        placeholder="Short excerpt (optional)"
        rows={2}
        className="rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
      />
      <div className="rounded-xl overflow-hidden border border-gray-700">
        <RichTextEditor
          value={content}
          onChange={setContent}
          placeholder="Write your article content here..."
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleSubmit('DRAFT')}
          disabled={isPending || !title || !slug || !content}
          className="flex-1 rounded-xl border border-gray-600 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Saving...' : 'Save as Draft'}
        </button>
        <button
          type="button"
          onClick={() => handleSubmit('PUBLISHED')}
          disabled={isPending || !title || !slug || !content}
          className="flex-1 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Publishing...' : 'Publish Now'}
        </button>
      </div>
    </div>
  );
}
