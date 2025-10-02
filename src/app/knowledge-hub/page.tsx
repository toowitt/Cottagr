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
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const { position, text, isRequired, notes } = entry as Record<string, unknown>;
      if (typeof position !== 'number' || typeof text !== 'string') return null;
      return {
        position,
        text,
        isRequired: typeof isRequired === 'boolean' ? isRequired : undefined,
        notes: typeof notes === 'string' ? notes : null,
      };
    })
    .filter((entry): entry is ItemSnapshot => Boolean(entry))
    .sort((a, b) => a.position - b.position);
}

function parseDocuments(raw: unknown): DocumentSnapshot[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const { id, title, version, fileUrl } = entry as Record<string, unknown>;
      if (typeof id !== 'number' || typeof title !== 'string') return null;
      return {
        id,
        title,
        version: typeof version === 'number' ? version : undefined,
        fileUrl: typeof fileUrl === 'string' ? fileUrl : undefined,
      };
    })
    .filter((entry): entry is DocumentSnapshot => Boolean(entry));
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
