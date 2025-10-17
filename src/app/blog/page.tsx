import { prisma } from '@/lib/prisma';
import { ArticleStatus } from '@prisma/client';
import Link from 'next/link';
import { Clock, Calendar, BookOpen } from 'lucide-react';

function formatDate(value: Date | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(value);
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const categorySlug = params.category;

  const [articles, categories] = await Promise.all([
    prisma.blogArticle.findMany({
      where: {
        status: ArticleStatus.PUBLISHED,
        ...(categorySlug && {
          category: { slug: categorySlug }
        })
      },
      include: {
        author: {
          select: { firstName: true, lastName: true }
        },
        category: true,
      },
      orderBy: { publishedAt: 'desc' },
    }),
    prisma.blogCategory.findMany({
      include: {
        _count: {
          select: { 
            articles: {
              where: { status: ArticleStatus.PUBLISHED }
            }
          }
        }
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  const selectedCategory = categorySlug 
    ? categories.find(c => c.slug === categorySlug) 
    : null;

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white md:text-5xl">
            CottagrBlog
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-white/70">
            Expert guidance on cottage ownership, legalities, and family transitions
          </p>
        </header>

        {categories.length > 0 && (
          <div className="mb-12 flex flex-wrap justify-center gap-3">
            <Link
              href="/blog"
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                !categorySlug
                  ? 'border-emerald-500 bg-emerald-500 text-black'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-500 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-emerald-500'
              }`}
            >
              All Articles
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/blog?category=${category.slug}`}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  categorySlug === category.slug
                    ? 'text-black'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-500 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-emerald-500'
                }`}
                style={{
                  ...(categorySlug === category.slug && {
                    borderColor: category.color || '#10b981',
                    backgroundColor: category.color || '#10b981',
                  })
                }}
              >
                {category.name} ({category._count.articles})
              </Link>
            ))}
          </div>
        )}

        {articles.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-12 text-center dark:border-white/10 dark:bg-white/5">
            <BookOpen className="mx-auto h-12 w-12 text-slate-400 dark:text-white/40" />
            <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">
              No articles yet
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-white/70">
              {selectedCategory 
                ? `No published articles in ${selectedCategory.name} category.` 
                : 'Check back soon for helpful articles.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/blog/${article.slug}`}
                className="group rounded-3xl border border-slate-200 bg-white p-6 transition-all hover:border-emerald-500 hover:shadow-xl dark:border-white/10 dark:bg-white/5 dark:hover:border-emerald-500"
              >
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
                <h2 className="mt-4 text-xl font-semibold text-slate-900 group-hover:text-emerald-600 dark:text-white dark:group-hover:text-emerald-400">
                  {article.title}
                </h2>
                {article.excerpt && (
                  <p className="mt-2 line-clamp-3 text-sm text-slate-600 dark:text-white/70">
                    {article.excerpt}
                  </p>
                )}
                <div className="mt-4 flex items-center gap-4 text-xs text-slate-500 dark:text-white/50">
                  {article.publishedAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(article.publishedAt)}
                    </span>
                  )}
                  {article.readingTimeMin && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {article.readingTimeMin} min read
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
