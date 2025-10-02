'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const checklistMetadataSchema = z.object({
  id: z.coerce.number(),
  title: z.string().min(1, 'Title is required').max(120),
  category: z.string().trim().max(80).optional(),
  summary: z.string().trim().max(400).optional(),
});

const checklistCreateSchema = checklistMetadataSchema.omit({ id: true });

const checklistItemSchema = z.object({
  id: z.coerce.number().optional(),
  checklistId: z.coerce.number(),
  text: z.string().min(1, 'Instruction is required').max(500),
  notes: z.string().trim().max(500).optional(),
  isRequired: z.coerce.boolean().optional().default(false),
  position: z.coerce.number().min(1).optional(),
});

const documentLinkSchema = z.object({
  checklistId: z.coerce.number(),
  documentId: z.coerce.number(),
});

function revalidateKnowledgeHub() {
  revalidatePath('/admin/knowledge-hub');
  revalidatePath('/knowledge-hub');
}

export async function createChecklistAction(formData: FormData) {
  const parsed = checklistCreateSchema.safeParse({
    title: formData.get('title'),
    category: formData.get('category'),
    summary: formData.get('summary'),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.flatten().formErrors.join(', '));
  }

  await prisma.knowledgeChecklist.create({
    data: {
      title: parsed.data.title.trim(),
      category: parsed.data.category?.trim() || null,
      summary: parsed.data.summary?.trim() || null,
    },
  });

  revalidateKnowledgeHub();
}

export async function updateChecklistMetadataAction(formData: FormData) {
  const parsed = checklistMetadataSchema.safeParse({
    id: formData.get('id'),
    title: formData.get('title'),
    category: formData.get('category'),
    summary: formData.get('summary'),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.flatten().formErrors.join(', '));
  }

  await prisma.knowledgeChecklist.update({
    where: { id: parsed.data.id },
    data: {
      title: parsed.data.title.trim(),
      category: parsed.data.category?.trim() || null,
      summary: parsed.data.summary?.trim() || null,
    },
  });

  revalidateKnowledgeHub();
}

export async function deleteChecklistAction(formData: FormData) {
  const id = Number(formData.get('id'));
  if (!Number.isFinite(id)) {
    throw new Error('Invalid checklist id');
  }

  await prisma.$transaction(async (tx) => {
    await tx.checklistDocument.deleteMany({ where: { checklistId: id } });
    await tx.checklistItem.deleteMany({ where: { checklistId: id } });
    await tx.checklistVersion.deleteMany({ where: { checklistId: id } });
    await tx.knowledgeChecklist.delete({ where: { id } });
  });

  revalidateKnowledgeHub();
}

export async function addChecklistItemAction(formData: FormData) {
  const parsed = checklistItemSchema.omit({ id: true, position: true }).safeParse({
    checklistId: formData.get('checklistId'),
    text: formData.get('text'),
    notes: formData.get('notes'),
    isRequired: formData.get('isRequired') === 'on',
  });

  if (!parsed.success) {
    throw new Error(parsed.error.flatten().formErrors.join(', '));
  }

  const { checklistId, text, notes, isRequired } = parsed.data;
  const lastPosition = await prisma.checklistItem.aggregate({
    where: { checklistId },
    _max: { position: true },
  });

  await prisma.checklistItem.create({
    data: {
      checklistId,
      text: text.trim(),
      notes: notes?.trim() || null,
      isRequired,
      position: (lastPosition._max.position ?? 0) + 1,
    },
  });

  revalidateKnowledgeHub();
}

export async function updateChecklistItemAction(formData: FormData) {
  const parsed = checklistItemSchema.safeParse({
    id: formData.get('id'),
    checklistId: formData.get('checklistId'),
    text: formData.get('text'),
    notes: formData.get('notes'),
    isRequired: formData.get('isRequired') === 'on',
    position: formData.get('position'),
  });

  if (!parsed.success || !parsed.data.id) {
    throw new Error(parsed.success ? 'Missing item id' : parsed.error.flatten().formErrors.join(', '));
  }

  const { id, checklistId, position, text, notes, isRequired } = parsed.data;

  await prisma.checklistItem.update({
    where: { id },
    data: {
      text: text.trim(),
      notes: notes?.trim() || null,
      isRequired,
      position,
    },
  });

  // Ensure positions remain sequential
  const items = await prisma.checklistItem.findMany({
    where: { checklistId },
    orderBy: { position: 'asc' },
  });

  await Promise.all(
    items.map((item, index) =>
      item.position === index + 1
        ? Promise.resolve()
        : prisma.checklistItem.update({ where: { id: item.id }, data: { position: index + 1 } })
    )
  );

  revalidateKnowledgeHub();
}

export async function deleteChecklistItemAction(formData: FormData) {
  const id = Number(formData.get('id'));
  const checklistId = Number(formData.get('checklistId'));

  if (!Number.isFinite(id) || !Number.isFinite(checklistId)) {
    throw new Error('Invalid item reference');
  }

  await prisma.checklistItem.delete({ where: { id } });

  const items = await prisma.checklistItem.findMany({
    where: { checklistId },
    orderBy: { position: 'asc' },
  });

  await Promise.all(
    items.map((item, index) =>
      item.position === index + 1
        ? Promise.resolve()
        : prisma.checklistItem.update({ where: { id: item.id }, data: { position: index + 1 } })
    )
  );

  revalidateKnowledgeHub();
}

const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'knowledge-hub');

async function ensureUploadDir() {
  await fs.mkdir(uploadDir, { recursive: true });
}

export async function uploadDocumentAction(formData: FormData) {
  const checklistIdRaw = formData.get('checklistId');
  const titleRaw = formData.get('title');
  const descriptionRaw = formData.get('description');
  const documentIdRaw = formData.get('documentId');
  const file = formData.get('file');

  if (!(file instanceof File)) {
    throw new Error('No file uploaded');
  }

  const title = typeof titleRaw === 'string' && titleRaw.trim().length > 0 ? titleRaw.trim() : file.name;
  const description = typeof descriptionRaw === 'string' && descriptionRaw.trim().length > 0 ? descriptionRaw.trim() : null;
  const checklistId = typeof checklistIdRaw === 'string' && checklistIdRaw.length ? Number(checklistIdRaw) : null;
  const documentId = typeof documentIdRaw === 'string' && documentIdRaw.length ? Number(documentIdRaw) : null;

  await ensureUploadDir();

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const extension = path.extname(file.name) || '';
  const fileName = `${Date.now()}-${randomUUID()}${extension}`;
  const filePath = path.join(uploadDir, fileName);
  await fs.writeFile(filePath, buffer);

  const relativeKey = `knowledge-hub/${fileName}`;
  const publicUrl = `/uploads/knowledge-hub/${fileName}`;
  const size = buffer.byteLength;
  const mimeType = file.type || undefined;

  if (documentId) {
    const existing = await prisma.knowledgeDocument.findUnique({ where: { id: documentId } });
    if (!existing) {
      throw new Error('Document not found');
    }

    const nextVersion = existing.version + 1;

    await prisma.$transaction(async (tx) => {
      await tx.documentVersion.create({
        data: {
          documentId,
          version: nextVersion,
          fileKey: relativeKey,
          fileUrl: publicUrl,
          mimeType,
          size,
          description,
        },
      });

      await tx.knowledgeDocument.update({
        where: { id: documentId },
        data: {
          title,
          description,
          fileKey: relativeKey,
          fileUrl: publicUrl,
          mimeType,
          size,
          version: nextVersion,
        },
      });
    });
  } else {
    const document = await prisma.knowledgeDocument.create({
      data: {
        title,
        description,
        fileKey: relativeKey,
        fileUrl: publicUrl,
        mimeType,
        size,
        version: 1,
        versions: {
          create: {
            version: 1,
            fileKey: relativeKey,
            fileUrl: publicUrl,
            mimeType,
            size,
            description,
          },
        },
      },
    });

    if (checklistId) {
      await prisma.checklistDocument.upsert({
        where: {
          checklistId_documentId: {
            checklistId,
            documentId: document.id,
          },
        },
        update: {},
        create: {
          checklistId,
          documentId: document.id,
        },
      });
    }
  }

  if (documentId && checklistId) {
    await prisma.checklistDocument.upsert({
      where: {
        checklistId_documentId: {
          checklistId,
          documentId,
        },
      },
      update: {},
      create: {
        checklistId,
        documentId,
      },
    });
  }

  revalidateKnowledgeHub();
}

export async function linkExistingDocumentAction(formData: FormData) {
  const parsed = documentLinkSchema.safeParse({
    checklistId: formData.get('checklistId'),
    documentId: formData.get('documentId'),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.flatten().formErrors.join(', '));
  }

  await prisma.checklistDocument.upsert({
    where: {
      checklistId_documentId: {
        checklistId: parsed.data.checklistId,
        documentId: parsed.data.documentId,
      },
    },
    update: {},
    create: parsed.data,
  });

  revalidateKnowledgeHub();
}

export async function unlinkDocumentAction(formData: FormData) {
  const parsed = documentLinkSchema.safeParse({
    checklistId: formData.get('checklistId'),
    documentId: formData.get('documentId'),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.flatten().formErrors.join(', '));
  }

  await prisma.checklistDocument.delete({
    where: {
      checklistId_documentId: parsed.data,
    },
  });

  revalidateKnowledgeHub();
}

export async function updateDocumentMetadataAction(formData: FormData) {
  const schema = z.object({
    id: z.coerce.number(),
    title: z.string().min(1).max(120),
    description: z.string().trim().max(400).optional(),
  });
  const parsed = schema.safeParse({
    id: formData.get('id'),
    title: formData.get('title'),
    description: formData.get('description'),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.flatten().formErrors.join(', '));
  }

  await prisma.knowledgeDocument.update({
    where: { id: parsed.data.id },
    data: {
      title: parsed.data.title.trim(),
      description: parsed.data.description?.trim() || null,
    },
  });

  revalidateKnowledgeHub();
}

export async function publishChecklistAction(formData: FormData) {
  const id = Number(formData.get('id'));
  if (!Number.isFinite(id)) {
    throw new Error('Invalid checklist id');
  }

  const checklist = await prisma.knowledgeChecklist.findUnique({
    where: { id },
    include: {
      items: { orderBy: { position: 'asc' } },
      documents: { include: { document: true } },
    },
  });

  if (!checklist) {
    throw new Error('Checklist not found');
  }

  const itemsSnapshot = checklist.items.map((item) => ({
    id: item.id,
    position: item.position,
    text: item.text,
    isRequired: item.isRequired,
    notes: item.notes,
  }));

  const documentSnapshot = checklist.documents.map(({ document }) => ({
    id: document.id,
    title: document.title,
    fileUrl: document.fileUrl,
    version: document.version,
  }));

  const now = new Date();
  const nextVersion = checklist.versionCounter;

  await prisma.$transaction(async (tx) => {
    await tx.checklistVersion.updateMany({
      where: { checklistId: checklist.id, isPublished: true },
      data: { isPublished: false },
    });

    await tx.checklistVersion.create({
      data: {
        checklistId: checklist.id,
        version: nextVersion,
        title: checklist.title,
        summary: checklist.summary,
        category: checklist.category,
        items: itemsSnapshot,
        documents: documentSnapshot,
        isPublished: true,
        publishedAt: now,
      },
    });

    await tx.knowledgeChecklist.update({
      where: { id: checklist.id },
      data: {
        status: 'PUBLISHED',
        versionCounter: nextVersion + 1,
        publishedAt: now,
      },
    });
  });

  revalidateKnowledgeHub();
}

export async function unpublishChecklistAction(formData: FormData) {
  const id = Number(formData.get('id'));
  if (!Number.isFinite(id)) {
    throw new Error('Invalid checklist id');
  }

  await prisma.$transaction(async (tx) => {
    await tx.checklistVersion.updateMany({
      where: { checklistId: id, isPublished: true },
      data: { isPublished: false },
    });

    await tx.knowledgeChecklist.update({
      where: { id },
      data: {
        status: 'DRAFT',
        publishedAt: null,
      },
    });
  });

  revalidateKnowledgeHub();
}

export async function archiveChecklistAction(formData: FormData) {
  const id = Number(formData.get('id'));
  if (!Number.isFinite(id)) {
    throw new Error('Invalid checklist id');
  }

  await prisma.knowledgeChecklist.update({
    where: { id },
    data: { status: 'ARCHIVED' },
  });

  revalidateKnowledgeHub();
}
