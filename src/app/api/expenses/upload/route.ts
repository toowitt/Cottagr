import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'expenses');

async function ensureUploadDir() {
  await fs.mkdir(uploadDir, { recursive: true });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'Uploaded file is empty' }, { status: 400 });
    }

    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSizeBytes) {
      return NextResponse.json({ error: 'File exceeds 10MB limit' }, { status: 413 });
    }

    await ensureUploadDir();

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const extension = path.extname(file.name) || '';
    const safeExtension = extension.toLowerCase();
    const fileName = `${Date.now()}-${randomUUID()}${safeExtension}`;
    const filePath = path.join(uploadDir, fileName);

    await fs.writeFile(filePath, buffer);

    const url = `/uploads/expenses/${fileName}`;

    return NextResponse.json({
      url,
      originalName: file.name,
      size: buffer.byteLength,
      mimeType: file.type || null,
    });
  } catch (error) {
    console.error('POST /api/expenses/upload error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
