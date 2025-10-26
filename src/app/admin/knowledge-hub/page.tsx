import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { prisma } from '@/lib/prisma';
import {
  addChecklistItemAction,
  archiveChecklistAction,
  createChecklistAction,
  deleteChecklistAction,
  deleteChecklistItemAction,
  linkExistingDocumentAction,
  publishChecklistAction,
  unpublishChecklistAction,
  updateChecklistItemAction,
  updateChecklistMetadataAction,
  updateDocumentMetadataAction,
  uploadDocumentAction,
  unlinkDocumentAction,
} from './actions';
import { ArrowUpCircle, CheckCircle2, FileText, FolderOpen, PlusCircle, UploadCloud } from 'lucide-react';

function formatDate(value: Date | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(value);
}

export default async function AdminKnowledgeHubPage() {
  const [checklists, documents] = await Promise.all([
    prisma.knowledgeChecklist.findMany({
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      include: {
        items: { orderBy: { position: 'asc' } },
        documents: { include: { document: true }, orderBy: { createdAt: 'desc' } },
        versions: { orderBy: { version: 'desc' } },
      },
    }),
    prisma.knowledgeDocument.findMany({
      orderBy: { title: 'asc' },
      include: {
        checklistLinks: { include: { checklist: true } },
        versions: { orderBy: { version: 'desc' } },
      },
    }),
  ]);

  return (
    <Container padding="md" className="space-y-10">
      <PageHeader
        title="Knowledge & maintenance hub"
        description="Build and publish the definitive playbooks, tasks, and reference documents your owners rely on. Draft updates below, then publish when they're ready."
      />

      <section className="rounded-3xl border border-default bg-surface px-6 py-6 shadow-soft">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <PlusCircle className="h-5 w-5 text-accent" /> New checklist
        </h2>
        <form action={createChecklistAction} className="mt-4 grid gap-3 md:grid-cols-[2fr,1fr]">
          <input
            type="text"
            name="title"
            required
            placeholder="Checklist title (e.g. Opening weekend)"
            className="w-full rounded-xl border border-default bg-background px-3 py-2 text-sm text-foreground shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
          <input
            type="text"
            name="category"
            placeholder="Category (optional)"
            className="w-full rounded-xl border border-default bg-background px-3 py-2 text-sm text-foreground shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
          <textarea
            name="summary"
            placeholder="Short description shown to owners"
            className="md:col-span-2 min-h-[60px] rounded-xl border border-default bg-background px-3 py-2 text-sm text-foreground shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
          <button
            type="submit"
            className="md:col-span-2 inline-flex w-full items-center justify-center rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-soft transition hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Create checklist
          </button>
        </form>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-semibold text-foreground">Draft &amp; published checklists</h2>
        {checklists.length === 0 ? (
          <p className="rounded-2xl border border-default bg-background-muted p-6 text-sm text-muted-foreground shadow-soft">
            No checklists yet. Create one above to get started.
          </p>
        ) : (
          <div className="space-y-6">
            {checklists.map((checklist) => {
              const linkedDocs = checklist.documents.map((link) => link.document);
              const otherDocuments = documents.filter((doc) => !linkedDocs.some((linked) => linked.id === doc.id));
              const activeVersion = checklist.versions.find((version) => version.isPublished);

              return (
                <article
                  key={checklist.id}
                  className="rounded-3xl border border-default bg-surface px-6 py-6 text-foreground shadow-soft"
                >
                  <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <span className="inline-flex items-center gap-2 rounded-full border border-default bg-background-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {checklist.category || 'General'} · {checklist.status}
                      </span>
                      <h3 className="mt-3 text-2xl font-semibold text-foreground">{checklist.title}</h3>
                      <p className="text-sm text-muted-foreground">Last updated {formatDate(checklist.updatedAt)}</p>
                      {activeVersion ? (
                        <p className="text-xs text-emerald-300">
                          Published version v{activeVersion.version} · {formatDate(activeVersion.publishedAt)}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <form action={publishChecklistAction}>
                        <input type="hidden" name="id" value={checklist.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-2 rounded-full border border-accent/60 px-3 py-1.5 text-accent transition hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                        >
                          <CheckCircle2 className="h-4 w-4" /> Publish
                        </button>
                      </form>
                      <form action={unpublishChecklistAction}>
                        <input type="hidden" name="id" value={checklist.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-2 rounded-full border border-warning/60 px-3 py-1.5 text-warning transition hover:bg-warning/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning focus-visible:ring-offset-2"
                        >
                          <FolderOpen className="h-4 w-4" /> Mark draft
                        </button>
                      </form>
                      <form action={archiveChecklistAction}>
                        <input type="hidden" name="id" value={checklist.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-2 rounded-full border border-default px-3 py-1.5 text-muted-foreground transition hover:bg-background-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border"
                        >
                          Archive
                        </button>
                      </form>
                      <form action={deleteChecklistAction}>
                        <input type="hidden" name="id" value={checklist.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-2 rounded-full border border-danger/60 px-3 py-1.5 text-danger transition hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </header>

                  <section className="mt-6 grid gap-6 md:grid-cols-[1.6fr,1fr]">
                    <div className="space-y-4">
                      <form action={updateChecklistMetadataAction} className="rounded-3xl border border-default bg-background px-5 py-5 shadow-soft">
                        <input type="hidden" name="id" value={checklist.id} />
                        <div className="grid gap-3">
                          <div className="grid gap-2 md:grid-cols-2">
                            <label className="text-sm text-foreground">
                              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Title
                              </span>
                              <input
                                name="title"
                                defaultValue={checklist.title}
                                className="w-full rounded-xl border border-default bg-background px-3 py-2 text-sm text-foreground shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                                required
                              />
                            </label>
                            <label className="text-sm text-foreground">
                              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Category
                              </span>
                              <input
                                name="category"
                                defaultValue={checklist.category ?? ''}
                                className="w-full rounded-xl border border-default bg-background px-3 py-2 text-sm text-foreground shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                              />
                            </label>
                          </div>
                          <label className="text-sm text-foreground">
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Summary
                            </span>
                            <textarea
                              name="summary"
                              defaultValue={checklist.summary ?? ''}
                              className="min-h-[60px] w-full rounded-xl border border-default bg-background px-3 py-2 text-sm text-foreground shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                            />
                          </label>
                          <button
                            type="submit"
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-3 py-2 text-sm font-semibold text-background transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2"
                          >
                            Save details
                          </button>
                        </div>
                      </form>

                      <div className="space-y-3">
                        <h4 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-300">
                          Checklist items
                        </h4>
                        {checklist.items.length === 0 ? (
                          <p className="rounded-xl border border-dashed border-gray-700 bg-gray-900/40 p-4 text-sm text-gray-400">
                            No steps yet. Add the first instruction below.
                          </p>
                        ) : (
                          <ul className="space-y-4">
                            {checklist.items.map((item) => (
                              <li key={item.id} className="rounded-2xl border border-default bg-background px-4 py-4 shadow-soft">
                                <form action={updateChecklistItemAction} className="grid gap-3">
                                  <input type="hidden" name="id" value={item.id} />
                                  <input type="hidden" name="checklistId" value={checklist.id} />
                                  <label className="text-sm text-foreground">
                                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                      Instruction
                                    </span>
                                    <textarea
                                      name="text"
                                      defaultValue={item.text}
                                      className="min-h-[70px] w-full rounded-xl border border-default bg-background px-3 py-2 text-sm text-foreground shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                                      required
                                    />
                                  </label>
                                  <label className="text-sm text-foreground">
                                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                      Notes
                                    </span>
                                    <textarea
                                      name="notes"
                                      defaultValue={item.notes ?? ''}
                                      className="min-h-[50px] w-full rounded-xl border border-default bg-background px-3 py-2 text-sm text-foreground shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                                    />
                                  </label>
                                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                    <label className="inline-flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        name="isRequired"
                                        defaultChecked={item.isRequired}
                                        className="h-4 w-4 rounded border border-default bg-background text-accent focus:ring-accent"
                                      />
                                      Required step
                                    </label>
                                    <label className="inline-flex items-center gap-2">
                                      Order
                                      <input
                                        type="number"
                                        name="position"
                                        min={1}
                                        defaultValue={item.position}
                                        className="w-16 rounded border border-default bg-background px-2 py-1 text-sm text-foreground shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                                      />
                                    </label>
                                  </div>
                                  <button
                                    type="submit"
                                    className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground transition hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                                  >
                                    Save item
                                  </button>
                                </form>
                                <form action={deleteChecklistItemAction} className="mt-2">
                                  <input type="hidden" name="id" value={item.id} />
                                  <input type="hidden" name="checklistId" value={checklist.id} />
                                  <button
                                    type="submit"
                                    className="inline-flex items-center gap-2 rounded-full border border-danger/60 px-3 py-2 text-sm text-danger transition hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2"
                                  >
                                    Remove
                                  </button>
                                </form>
                              </li>
                            ))}
                          </ul>
                        )}

                        <form action={addChecklistItemAction} className="rounded-xl border border-dashed border-gray-700 bg-gray-900/40 p-4">
                          <input type="hidden" name="checklistId" value={checklist.id} />
                          <div className="grid gap-3">
                            <textarea
                              name="text"
                              placeholder="Add a new instruction"
                              className="min-h-[80px] w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                              required
                            />
                            <textarea
                              name="notes"
                              placeholder="Optional notes or context"
                              className="min-h-[60px] w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            />
                            <label className="inline-flex items-center gap-2 text-sm text-gray-200">
                              <input
                                type="checkbox"
                                name="isRequired"
                                className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500"
                              />
                              Required step
                            </label>
                            <button
                              type="submit"
                              className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-white"
                            >
                              Add item
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4">
                        <h4 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-300">
                          <FileText className="h-4 w-4" /> Linked documents
                        </h4>
                        {linkedDocs.length === 0 ? (
                          <p className="mt-3 text-sm text-gray-400">No documents attached yet.</p>
                        ) : (
                          <ul className="mt-3 space-y-3 text-sm">
                            {linkedDocs.map((doc) => (
                              <li key={doc.id} className="rounded-lg border border-gray-800 bg-gray-900/70 p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="font-medium text-white">{doc.title}</p>
                                    <p className="text-xs text-gray-400">
                                      v{doc.version} · {Math.round((doc.size ?? 0) / 1024)} KB
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <a
                                      href={doc.fileUrl ?? '#'}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="rounded-lg border border-gray-700 px-2 py-1 text-xs text-gray-300 hover:bg-gray-800"
                                    >
                                      View
                                    </a>
                                    <form action={unlinkDocumentAction}>
                                      <input type="hidden" name="checklistId" value={checklist.id} />
                                      <input type="hidden" name="documentId" value={doc.id} />
                                      <button
                                        type="submit"
                                        className="rounded-lg border border-red-500/40 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                                      >
                                        Unlink
                                      </button>
                                    </form>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}

                        {otherDocuments.length > 0 ? (
                          <form action={linkExistingDocumentAction} className="mt-4 grid gap-2">
                            <input type="hidden" name="checklistId" value={checklist.id} />
                            <select
                              name="documentId"
                              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                              required
                            >
                              <option value="">Link existing document…</option>
                              {otherDocuments.map((doc) => (
                                <option key={doc.id} value={doc.id}>
                                  {doc.title} (v{doc.version})
                                </option>
                              ))}
                            </select>
                            <button
                              type="submit"
                              className="inline-flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-200 hover:bg-gray-800"
                            >
                              Attach document
                            </button>
                          </form>
                        ) : null}
                      </div>

                      <form
                        action={uploadDocumentAction}
                        className="rounded-2xl border border-dashed border-emerald-500/50 bg-emerald-500/5 p-4 text-sm text-emerald-100"
                      >
                        <input type="hidden" name="checklistId" value={checklist.id} />
                        <h4 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-200">
                          <UploadCloud className="h-4 w-4" /> Upload a document
                        </h4>
                        <p className="mt-2 text-xs text-emerald-200/80">
                          PDF, images, or docs. Files are stored under /public/uploads/knowledge-hub.
                        </p>
                        <div className="mt-3 grid gap-2">
                          <input
                            type="text"
                            name="title"
                            placeholder="Document title"
                            className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                          />
                          <textarea
                            name="description"
                            placeholder="Description (optional)"
                            className="min-h-[50px] rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                          />
                          <input
                            type="file"
                            name="file"
                            required
                            className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                          />
                          <button
                            type="submit"
                            formEncType="multipart/form-data"
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-black hover:bg-emerald-400"
                          >
                            Upload &amp; attach
                          </button>
                        </div>
                      </form>
                    </div>
                  </section>

                  {checklist.versions.length > 0 ? (
                    <section className="mt-6 rounded-2xl border border-gray-800 bg-gray-900/50 p-4">
                      <h4 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-300">
                        <ArrowUpCircle className="h-4 w-4" /> Version history
                      </h4>
                      <ul className="mt-3 space-y-2 text-sm text-gray-300">
                        {checklist.versions.map((version) => (
                          <li key={version.id} className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/70 px-3 py-2">
                            <span>v{version.version}</span>
                            <span className="text-xs text-gray-400">
                              {version.isPublished ? 'Published' : 'Draft snapshot'} · {formatDate(version.publishedAt ?? version.createdAt)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Document library</h2>
        </div>
        {documents.length === 0 ? (
          <p className="rounded-2xl border border-gray-800 bg-gray-900/40 p-6 text-sm text-gray-300">
            Upload documents from any checklist to build the shared library.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {documents.map((doc) => (
              <article key={doc.id} className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4 text-white">
                <header className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{doc.title}</h3>
                    <p className="text-xs text-gray-400">
                      v{doc.version} · {Math.round((doc.size ?? 0) / 1024)} KB · {doc.mimeType ?? 'unknown'}
                    </p>
                    <p className="text-xs text-gray-500">Uploaded {formatDate(doc.createdAt)}</p>
                  </div>
                  <a
                    href={doc.fileUrl ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-gray-700 px-3 py-1 text-xs text-gray-300 hover:bg-gray-800"
                  >
                    View file
                  </a>
                </header>

                <form action={updateDocumentMetadataAction} className="mt-3 grid gap-2">
                  <input type="hidden" name="id" value={doc.id} />
                  <input
                    name="title"
                    defaultValue={doc.title}
                    className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  <textarea
                    name="description"
                    defaultValue={doc.description ?? ''}
                    className="min-h-[50px] rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-white"
                  >
                    Save metadata
                  </button>
                </form>

                <form
                  action={uploadDocumentAction}
                  className="mt-3 rounded-xl border border-dashed border-gray-700 bg-gray-900/40 p-3"
                >
                  <input type="hidden" name="documentId" value={doc.id} />
                  <label className="text-xs uppercase tracking-wide text-gray-400">
                    Upload new version
                    <input
                      type="file"
                      name="file"
                      required
                      className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </label>
                  <textarea
                    name="description"
                    placeholder="Version notes (optional)"
                    className="mt-2 min-h-[50px] rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  <button
                    type="submit"
                    formEncType="multipart/form-data"
                    className="mt-2 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-black hover:bg-emerald-400"
                  >
                    Upload version
                  </button>
                </form>

                {doc.checklistLinks.length > 0 ? (
                  <div className="mt-3 rounded-lg border border-gray-800 bg-gray-900/50 p-3 text-xs text-gray-300">
                    Linked to:{' '}
                    {doc.checklistLinks.map((link, index) => (
                      <span key={link.checklistId}>
                        {link.checklist.title}
                        {index < doc.checklistLinks.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                ) : null}

                {doc.versions.length > 0 ? (
                  <details className="mt-3 rounded-lg border border-gray-800 bg-gray-900/50 p-3">
                    <summary className="cursor-pointer text-sm font-medium text-gray-200">Version history</summary>
                    <ul className="mt-2 space-y-2 text-xs text-gray-300">
                      {doc.versions.map((version) => (
                        <li key={version.id} className="flex items-center justify-between rounded border border-gray-800 bg-gray-900/70 px-2 py-1">
                          <span>v{version.version}</span>
                          <span>{formatDate(version.createdAt)}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </Container>
  );
}
