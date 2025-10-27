import { prisma } from '@/lib/prisma';
import BlogClient from './client';

function formatDate(value: Date | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(value);
}

export default async function AdminBlogPage() {
  const [articles, categories] = await Promise.all([
    prisma.blogArticle.findMany({
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      include: {
        author: {
          select: { firstName: true, lastName: true },
        },
        category: true,
      },
    }),
    prisma.blogCategory.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { articles: true },
        },
      },
    }),
  ]);

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-white">CottagrBlog</h1>
        <p className="text-sm text-gray-300">
          Publish helpful articles about cottage legalities, how-tos, wills, inheritance, and more.
        </p>
      </header>

      <BlogClient categories={categories.map(({ id, name }) => ({ id, name }))} />

      <section className="space-y-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-white">Articles</h2>
        {articles.length === 0 ? (
          <p className="rounded-2xl border border-gray-800 bg-gray-900/40 p-6 text-sm text-gray-300">
            No articles yet. Create one above to get started.
          </p>
        ) : (
          <div className="space-y-6">
            {articles.map((article) => (
              <article
                key={article.id}
                className="rounded-3xl border border-gray-800 bg-gray-900/40 p-6 text-white shadow-lg"
              >
                <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center gap-2 rounded-full border border-gray-700 px-3 py-1 text-xs uppercase tracking-wide"
                        style={{
                          backgroundColor: article.category?.color ? `${article.category.color}20` : '#10b98120',
                          color: article.category?.color || '#10b981',
                          borderColor: article.category?.color ? `${article.category.color}40` : '#10b98140',
                        }}
                      >
                        {article.category?.name || 'Uncategorized'}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-gray-700 bg-gray-800 px-3 py-1 text-xs uppercase tracking-wide text-gray-300">
                        {article.status}
                      </span>
                    </div>
                    <h3 className="mt-3 text-2xl font-semibold">{article.title}</h3>
                    <p className="text-sm text-gray-300">
                      Last updated {formatDate(article.updatedAt)}
                      {article.readingTimeMin && ` · ${article.readingTimeMin} min read`}
                    </p>
                    {article.publishedAt && (
                      <p className="text-xs text-emerald-300">Published {formatDate(article.publishedAt)}</p>
                    )}
                    {article.excerpt && (
                      <p className="mt-2 text-sm text-gray-400">{article.excerpt}</p>
                    )}
                  </div>
                </header>

                {article.content ? (
                  <div className="mt-4 border-t border-gray-800 pt-4 text-sm text-gray-200">
                    <div dangerouslySetInnerHTML={{ __html: article.content }} />
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
