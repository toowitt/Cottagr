"use client";

import BlogArticleForm from '@/components/BlogArticleForm';
import dynamic from 'next/dynamic';

const ClientEditor = dynamic(() => import('./V2Editor').then((mod) => mod.default), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-2xl border border-gray-800 bg-gray-900/60" />,
});

interface BlogClientProps {
  categories: Array<{ id: number; name: string }>;
}

export default function BlogClient({ categories }: BlogClientProps) {
  return (
    <div className="space-y-6">
      <ClientEditor />
      <section className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
        <BlogArticleForm categories={categories} />
      </section>
    </div>
  );
}
