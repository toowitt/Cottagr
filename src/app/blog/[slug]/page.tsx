import { prisma } from '@/lib/prisma';
import { ArticleStatus } from '@prisma/client';
import Link from 'next/link';
import { Calendar, Clock, ArrowLeft, BookOpen } from 'lucide-react';
import { notFound } from 'next/navigation';

function formatDate(value: Date | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(value);
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await prisma.blogArticle.findUnique({
    where: { 
      slug,
      status: ArticleStatus.PUBLISHED,
    },
    include: {
      author: {
        select: { firstName: true, lastName: true }
      },
      category: true,
      tags: {
        include: { tag: true }
      }
    },
  });

  if (!article) {
    notFound();
  }

  await prisma.blogArticle.update({
    where: { id: article.id },
    data: { viewCount: { increment: 1 } }
  });

  const relatedArticles = await prisma.blogArticle.findMany({
    where: {
      id: { not: article.id },
      status: ArticleStatus.PUBLISHED,
      categoryId: article.categoryId,
    },
    include: {
      category: true,
    },
    take: 3,
    orderBy: { publishedAt: 'desc' },
  });

  const authorName = article.author?.firstName && article.author?.lastName
    ? `${article.author.firstName} ${article.author.lastName}`
    : article.author?.firstName || 'Cottagr Team';

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to all articles
        </Link>

        <article className="mt-8">
          <header className="border-b border-slate-200 pb-8 dark:border-white/10">
            {article.category && (
              <div
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  backgroundColor: `${article.category.color}20`,
                  color: article.category.color || '#10b981',
                }}
              >
                {article.category.name}
              </div>
            )}
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 dark:text-white md:text-5xl">
              {article.title}
            </h1>
            {article.excerpt && (
              <p className="mt-4 text-xl text-slate-600 dark:text-white/70">
                {article.excerpt}
              </p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-white/60">
              <span>By {authorName}</span>
              {article.publishedAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(article.publishedAt)}
                </span>
              )}
              {article.readingTimeMin && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {article.readingTimeMin} min read
                </span>
              )}
              <span className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                {article.viewCount} views
              </span>
            </div>
          </header>

          <div 
            className="prose prose-slate mt-12 max-w-none dark:prose-invert prose-headings:font-semibold prose-a:text-emerald-600 dark:prose-a:text-emerald-400"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </article>

        {relatedArticles.length > 0 && (
          <section className="mt-16 border-t border-slate-200 pt-12 dark:border-white/10">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Related Articles</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedArticles.map((related) => (
                <Link
                  key={related.id}
                  href={`/blog/${related.slug}`}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-emerald-500 hover:shadow-lg dark:border-white/10 dark:bg-white/5 dark:hover:border-emerald-500"
                >
                  {related.category && (
                    <div
                      className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium"
                      style={{
                        backgroundColor: `${related.category.color}20`,
                        color: related.category.color || '#10b981',
                      }}
                    >
                      {related.category.name}
                    </div>
                  )}
                  <h3 className="mt-3 font-semibold text-slate-900 group-hover:text-emerald-600 dark:text-white dark:group-hover:text-emerald-400">
                    {related.title}
                  </h3>
                  {related.excerpt && (
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-white/70">
                      {related.excerpt}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
