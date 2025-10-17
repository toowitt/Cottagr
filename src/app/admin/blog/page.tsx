import { prisma } from '@/lib/prisma';
import {
  createArticleAction,
  updateArticleAction,
  publishArticleAction,
  unpublishArticleAction,
  archiveArticleAction,
  deleteArticleAction,
  createCategoryAction,
} from './actions';
import { CheckCircle2, FolderOpen, PlusCircle, BookOpen, Archive } from 'lucide-react';

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
          select: { firstName: true, lastName: true }
        },
        category: true,
      },
    }),
    prisma.blogCategory.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { articles: true }
        }
      }
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

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <PlusCircle className="h-5 w-5 text-emerald-400" /> New Article
          </h2>
          <form action={createArticleAction} className="mt-4 grid gap-3">
            <input
              type="text"
              name="title"
              required
              placeholder="Article title"
              className="rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <input
              type="text"
              name="slug"
              required
              placeholder="URL slug (e.g., cottage-inheritance-guide)"
              className="rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <select
              name="categoryId"
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
              name="excerpt"
              placeholder="Short excerpt (optional)"
              rows={2}
              className="rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <textarea
              name="content"
              required
              placeholder="Article content (supports markdown)"
              rows={6}
              className="rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                name="status"
                value="DRAFT"
                className="flex-1 rounded-xl border border-gray-600 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
              >
                Save as Draft
              </button>
              <button
                type="submit"
                name="status"
                value="PUBLISHED"
                className="flex-1 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-400"
              >
                Publish Now
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <FolderOpen className="h-5 w-5 text-emerald-400" /> New Category
          </h2>
          <form action={createCategoryAction} className="mt-4 grid gap-3">
            <input
              type="text"
              name="name"
              required
              placeholder="Category name (e.g., Legalities)"
              className="rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <input
              type="text"
              name="slug"
              required
              placeholder="URL slug (e.g., legalities)"
              className="rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <textarea
              name="description"
              placeholder="Description (optional)"
              rows={2}
              className="rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <input
              type="color"
              name="color"
              defaultValue="#10b981"
              className="h-10 w-full rounded-xl border border-gray-700 bg-gray-800 px-2 py-1"
            />
            <button
              type="submit"
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-400"
            >
              Create Category
            </button>
          </form>
          
          <div className="mt-6 space-y-2">
            <h3 className="text-sm font-medium text-gray-300">Existing Categories</h3>
            {categories.length === 0 ? (
              <p className="text-xs text-gray-400">No categories yet</p>
            ) : (
              <div className="space-y-1">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-800/40 px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: cat.color || '#10b981' }}
                      />
                      <span className="text-white">{cat.name}</span>
                    </span>
                    <span className="text-xs text-gray-400">{cat._count.articles} articles</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="space-y-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
          <BookOpen className="h-5 w-5 text-emerald-400" />
          Articles
        </h2>
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
                          borderColor: article.category?.color ? `${article.category.color}40` : '#10b98140'
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
                      <p className="text-xs text-emerald-300">
                        Published {formatDate(article.publishedAt)}
                      </p>
                    )}
                    {article.excerpt && (
                      <p className="mt-2 text-sm text-gray-400">{article.excerpt}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <form action={publishArticleAction}>
                      <input type="hidden" name="id" value={article.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 px-3 py-1.5 text-emerald-300 hover:bg-emerald-500/10"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Publish
                      </button>
                    </form>
                    <form action={unpublishArticleAction}>
                      <input type="hidden" name="id" value={article.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 px-3 py-1.5 text-amber-300 hover:bg-amber-500/10"
                      >
                        <FolderOpen className="h-4 w-4" /> Draft
                      </button>
                    </form>
                    <form action={archiveArticleAction}>
                      <input type="hidden" name="id" value={article.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-600 px-3 py-1.5 text-gray-300 hover:bg-gray-700/40"
                      >
                        <Archive className="h-4 w-4" /> Archive
                      </button>
                    </form>
                    <form action={deleteArticleAction}>
                      <input type="hidden" name="id" value={article.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 px-3 py-1.5 text-red-300 hover:bg-red-500/10"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </header>

                <details className="mt-6">
                  <summary className="cursor-pointer text-sm font-medium text-emerald-400 hover:text-emerald-300">
                    Edit article
                  </summary>
                  <form action={updateArticleAction} className="mt-4 grid gap-3 rounded-2xl border border-gray-800 bg-gray-900/60 p-4">
                    <input type="hidden" name="id" value={article.id} />
                    <input
                      type="text"
                      name="title"
                      defaultValue={article.title}
                      required
                      className="rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                    <input
                      type="text"
                      name="slug"
                      defaultValue={article.slug}
                      required
                      className="rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                    <select
                      name="categoryId"
                      defaultValue={article.categoryId || ''}
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
                      name="excerpt"
                      defaultValue={article.excerpt || ''}
                      rows={2}
                      className="rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                    <textarea
                      name="content"
                      defaultValue={article.content}
                      required
                      rows={8}
                      className="rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                    <button
                      type="submit"
                      className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-400"
                    >
                      Update Article
                    </button>
                  </form>
                </details>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
