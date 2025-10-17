'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { ArticleStatus } from '@prisma/client';

export async function createArticleAction(formData: FormData) {
  const title = formData.get('title') as string;
  const slug = formData.get('slug') as string;
  const excerpt = formData.get('excerpt') as string;
  const content = formData.get('content') as string;
  const categoryId = formData.get('categoryId') as string;
  const status = formData.get('status') as string;

  if (!title || !slug || !content) {
    throw new Error('Title, slug, and content are required');
  }

  const wordCount = content.split(/\s+/).length;
  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  await prisma.blogArticle.create({
    data: {
      title,
      slug,
      excerpt: excerpt || null,
      content,
      status: (status as ArticleStatus) || ArticleStatus.DRAFT,
      publishedAt: status === ArticleStatus.PUBLISHED ? new Date() : null,
      readingTimeMin,
      categoryId: categoryId ? parseInt(categoryId) : null,
    },
  });

  revalidatePath('/admin/blog');
  revalidatePath('/blog');
}

export async function updateArticleAction(formData: FormData) {
  const id = parseInt(formData.get('id') as string);
  const title = formData.get('title') as string;
  const slug = formData.get('slug') as string;
  const excerpt = formData.get('excerpt') as string;
  const content = formData.get('content') as string;
  const categoryId = formData.get('categoryId') as string;

  const wordCount = content.split(/\s+/).length;
  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  await prisma.blogArticle.update({
    where: { id },
    data: {
      title,
      slug,
      excerpt: excerpt || null,
      content,
      readingTimeMin,
      categoryId: categoryId ? parseInt(categoryId) : null,
    },
  });

  revalidatePath('/admin/blog');
  revalidatePath('/blog');
  revalidatePath(`/blog/${slug}`);
}

export async function publishArticleAction(formData: FormData) {
  const id = parseInt(formData.get('id') as string);
  
  const article = await prisma.blogArticle.findUnique({ where: { id } });
  
  await prisma.blogArticle.update({
    where: { id },
    data: {
      status: ArticleStatus.PUBLISHED,
      publishedAt: article?.publishedAt || new Date(),
    },
  });

  revalidatePath('/admin/blog');
  revalidatePath('/blog');
}

export async function unpublishArticleAction(formData: FormData) {
  const id = parseInt(formData.get('id') as string);

  await prisma.blogArticle.update({
    where: { id },
    data: { status: ArticleStatus.DRAFT },
  });

  revalidatePath('/admin/blog');
  revalidatePath('/blog');
}

export async function archiveArticleAction(formData: FormData) {
  const id = parseInt(formData.get('id') as string);

  await prisma.blogArticle.update({
    where: { id },
    data: { status: ArticleStatus.ARCHIVED },
  });

  revalidatePath('/admin/blog');
  revalidatePath('/blog');
}

export async function deleteArticleAction(formData: FormData) {
  const id = parseInt(formData.get('id') as string);

  await prisma.blogArticle.delete({
    where: { id },
  });

  revalidatePath('/admin/blog');
  revalidatePath('/blog');
}

export async function createCategoryAction(formData: FormData) {
  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string;
  const description = formData.get('description') as string;
  const color = formData.get('color') as string;

  if (!name || !slug) {
    throw new Error('Name and slug are required');
  }

  await prisma.blogCategory.create({
    data: {
      name,
      slug,
      description: description || null,
      color: color || '#10b981',
    },
  });

  revalidatePath('/admin/blog');
}
