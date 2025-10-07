import { prisma } from '@/lib/prisma';
import { KnowledgeHubContent } from './KnowledgeHubContent';

type ItemSnapshot = {
  position: number;
  text: string;
  isRequired?: boolean;
  notes?: string | null;
};

type DocumentSnapshot = {
  id: number;
  title: string;
  version?: number;
  fileUrl?: string | null;
};

function parseItems(raw: unknown): ItemSnapshot[] {
  if (!Array.isArray(raw)) return [];

  const items: ItemSnapshot[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const { position, text, isRequired, notes } = entry as Record<string, unknown>;
    if (typeof position !== 'number' || typeof text !== 'string') continue;

    items.push({
      position,
      text,
      isRequired: typeof isRequired === 'boolean' ? isRequired : undefined,
      notes: typeof notes === 'string' ? notes : null,
    });
  }

  return items.sort((a, b) => a.position - b.position);
}

function parseDocuments(raw: unknown): DocumentSnapshot[] {
  if (!Array.isArray(raw)) return [];

  const docs: DocumentSnapshot[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const { id, title, version, fileUrl } = entry as Record<string, unknown>;
    if (typeof id !== 'number' || typeof title !== 'string') continue;

    docs.push({
      id,
      title,
      version: typeof version === 'number' ? version : undefined,
      fileUrl: typeof fileUrl === 'string' ? fileUrl : undefined,
    });
  }

  return docs;
}

export default async function KnowledgeHubPage() {
  const publishedVersions = await prisma.checklistVersion.findMany({
    where: { isPublished: true },
    include: {
      checklist: true,
    },
    orderBy: [{ checklist: { category: 'asc' } }, { checklist: { title: 'asc' } }],
  });

  const checklists = publishedVersions.map((version) => ({
    id: version.checklistId,
    title: version.title,
    summary: version.summary,
    category: version.category,
    version: version.version,
    publishedAt: version.publishedAt,
    items: parseItems(version.items),
    documents: parseDocuments(version.documents),
  }));

  const documents = await prisma.knowledgeDocument.findMany({
    orderBy: { title: 'asc' },
  });

  return <KnowledgeHubContent checklists={checklists} documents={documents} />;
}
