import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ArticleStatus } from '@prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const article = await prisma.blogArticle.findUnique({
      where: { slug },
      include: {
        author: {
          select: { firstName: true, lastName: true, email: true }
        },
        category: true,
        tags: {
          include: { tag: true }
        }
      }
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    await prisma.blogArticle.update({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } }
    });

    const relatedArticles = await prisma.blogArticle.findMany({
      where: {
        id: { not: article.id },
        status: ArticleStatus.PUBLISHED,
        OR: [
          { categoryId: article.categoryId },
          {
            tags: {
              some: {
                tagId: {
                  in: article.tags.map(t => t.tagId)
                }
              }
            }
          }
        ]
      },
      include: {
        category: true,
        author: {
          select: { firstName: true, lastName: true }
        }
      },
      take: 3,
      orderBy: { publishedAt: 'desc' }
    });

    return NextResponse.json({ article, relatedArticles });
  } catch (err) {
    console.error('GET /api/blog/articles/[slug] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch article' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { title, excerpt, content, featuredImage, status, categoryId, tags } = body;

    const existingArticle = await prisma.blogArticle.findUnique({
      where: { slug }
    });

    if (!existingArticle) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    const wordCount = content?.split(/\s+/).length || 0;
    const readingTimeMin = wordCount > 0 ? Math.max(1, Math.ceil(wordCount / 200)) : existingArticle.readingTimeMin;

    const shouldPublish = status === ArticleStatus.PUBLISHED && existingArticle.status !== ArticleStatus.PUBLISHED;

    const article = await prisma.blogArticle.update({
      where: { slug },
      data: {
        ...(title && { title }),
        ...(excerpt !== undefined && { excerpt }),
        ...(content && { content, readingTimeMin }),
        ...(featuredImage !== undefined && { featuredImage }),
        ...(status && { status }),
        ...(categoryId !== undefined && { categoryId }),
        ...(shouldPublish && { publishedAt: new Date() }),
      },
      include: {
        author: {
          select: { firstName: true, lastName: true, email: true }
        },
        category: true,
        tags: {
          include: { tag: true }
        }
      }
    });

    if (tags && Array.isArray(tags)) {
      await prisma.articleTag.deleteMany({
        where: { articleId: article.id }
      });
      
      for (const tagId of tags) {
        await prisma.articleTag.create({
          data: {
            articleId: article.id,
            tagId
          }
        });
      }
    }

    return NextResponse.json({ article });
  } catch (err) {
    console.error('PUT /api/blog/articles/[slug] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update article' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const article = await prisma.blogArticle.findUnique({
      where: { slug }
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    await prisma.blogArticle.delete({
      where: { slug }
    });

    return NextResponse.json({ message: 'Article deleted successfully' });
  } catch (err) {
    console.error('DELETE /api/blog/articles/[slug] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete article' },
      { status: 500 }
    );
  }
}
