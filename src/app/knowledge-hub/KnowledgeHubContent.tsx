import { CalendarClock, ClipboardCheck, FileArchive, ShieldCheck, Users, Wrench } from 'lucide-react';

type PublishedChecklist = {
  id: number;
  title: string;
  summary?: string | null;
  category?: string | null;
  version: number;
  publishedAt?: Date | null;
  items: Array<{
    position: number;
    text: string;
    isRequired?: boolean;
    notes?: string | null;
  }>;
  documents: Array<{
    id: number;
    title: string;
    version?: number;
    fileUrl?: string | null;
  }>;
};

type KnowledgeDocument = {
  id: number;
  title: string;
  description?: string | null;
  version: number;
  fileUrl?: string | null;
};

interface KnowledgeHubContentProps {
  checklists: PublishedChecklist[];
  documents: KnowledgeDocument[];
}

const formatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export function KnowledgeHubContent({ checklists, documents }: KnowledgeHubContentProps) {
  const grouped = checklists.reduce<Record<string, PublishedChecklist[]>>((acc, checklist) => {
    const key = (checklist.category && checklist.category.length > 0 ? checklist.category : 'General playbooks').trim();
    if (!acc[key]) acc[key] = [];
    acc[key].push(checklist);
    return acc;
  }, {});

  return (
    <div className="space-y-16">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-10 text-white shadow-xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl space-y-4">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-wider text-white/70">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Knowledge &amp; Maintenance Hub
            </p>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Your digital cottage handbook</h1>
            <p className="text-base text-white/70">
              A single source of truth for opening, closing, and caring for your cottage. Browse published checklists, maintenance cadences, and reference files—always the latest version.
            </p>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-sm text-white/70">
            <ClipboardCheck className="h-10 w-10 text-emerald-400" />
            <div className="space-y-1">
              <div className="font-semibold text-white">Version-controlled playbooks</div>
              <p>Owners see the newest instructions with links to every supporting document.</p>
            </div>
          </div>
        </div>
      </section>

      {Object.entries(grouped).length === 0 ? (
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/70">
          No published checklists yet. Check back soon.
        </section>
      ) : (
        Object.entries(grouped).map(([category, categoryChecklists]) => (
          <section key={category} className="space-y-6">
            <header className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">{category}</h2>
              <p className="text-sm text-white/70">
                {categoryChecklists.length} checklist{categoryChecklists.length === 1 ? '' : 's'} · Last updated{' '}
                {formatter.format(
                  categoryChecklists.reduce((latest, checklist) => {
                    const publishedAt = checklist.publishedAt ? new Date(checklist.publishedAt) : null;
                    if (!publishedAt) return latest;
                    return publishedAt > latest ? publishedAt : latest;
                  }, new Date(0))
                )}
              </p>
            </header>
            <div className="grid gap-6 md:grid-cols-2">
              {categoryChecklists.map((checklist) => (
                <article key={checklist.id} className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-lg font-semibold text-white">{checklist.title}</h3>
                    <span className="rounded-full border border-emerald-400/50 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                      v{checklist.version}
                    </span>
                  </div>
                  {checklist.summary ? (
                    <p className="mt-2 text-sm text-white/70">{checklist.summary}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-white/50">
                    Published {checklist.publishedAt ? formatter.format(new Date(checklist.publishedAt)) : 'recently'}
                  </p>

                  <ul className="mt-4 space-y-3 text-sm text-white/80">
                    {checklist.items.map((item) => (
                      <li key={`${checklist.id}-${item.position}`} className="flex gap-3">
                        <span className="mt-1 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-400/10 text-xs text-emerald-200">
                          {item.position}
                        </span>
                        <div>
                          <p className="font-medium text-white/90">{item.text}</p>
                          {item.notes ? <p className="text-xs text-white/60">{item.notes}</p> : null}
                          {item.isRequired ? (
                            <span className="mt-1 inline-block rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/60">
                              Required
                            </span>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>

                  {checklist.documents.length > 0 ? (
                    <div className="mt-4 space-y-2 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/80">
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/60">
                        <FileArchive className="h-4 w-4 text-emerald-300" /> Supporting documents
                      </p>
                      <ul className="space-y-2">
                        {checklist.documents.map((doc) => (
                          <li key={doc.id}>
                            <a
                              href={doc.fileUrl ?? '#'}
                              className="inline-flex items-center gap-2 text-sm text-emerald-200 hover:text-emerald-100"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <FileArchive className="h-4 w-4" /> {doc.title} (v{doc.version ?? 1})
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ))
      )}

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-lg">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Maintenance rhythms &amp; vendors</h2>
            <p className="text-sm text-white/70">
              Keep tabs on recurring service partners and seasonal health checks.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-xs uppercase tracking-wide text-white/60">
            <CalendarClock className="h-4 w-4 text-emerald-300" /> Auto reminders recommended
          </div>
        </header>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {checklists
            .filter((checklist) => (checklist.category ?? '').toLowerCase().includes('maintenance'))
            .map((checklist) => (
              <article key={checklist.id} className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/80">
                <h3 className="text-lg font-semibold text-emerald-300">{checklist.title}</h3>
                <p className="text-xs text-white/50">v{checklist.version}</p>
                <ul className="mt-3 space-y-2">
                  {checklist.items.slice(0, 5).map((item) => (
                    <li key={`${checklist.id}-summary-${item.position}`} className="flex gap-2">
                      <span className="text-emerald-300">–</span>
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
        </div>
      </section>

      <section className="space-y-6">
        <header className="space-y-2">
          <h2 className="text-2xl font-semibold text-white">Document vault</h2>
          <p className="text-sm text-white/70">
            Insurance, permits, wiring diagrams, and ownership agreements—everything families need to reference in a pinch.
          </p>
        </header>
        {documents.length === 0 ? (
          <p className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/60">
            No documents published yet.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {documents.map((doc) => (
              <article key={doc.id} className="flex gap-4 rounded-3xl border border-white/10 bg-black/30 p-6 text-white">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                  <Wrench className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{doc.title}</h3>
                    <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-xs text-white/60">
                      v{doc.version}
                    </span>
                  </div>
                  {doc.description ? (
                    <p className="text-sm text-white/70">{doc.description}</p>
                  ) : null}
                  <a
                    href={doc.fileUrl ?? '#'}
                    className="inline-flex items-center gap-2 text-sm text-emerald-200 hover:text-emerald-100"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Users className="h-4 w-4" /> View document
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
