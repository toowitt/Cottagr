import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ArticleStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categorySlug = searchParams.get('category');
    const status = searchParams.get('status') || 'PUBLISHED';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    const where: any = {};
    
    if (status === 'PUBLISHED') {
      where.status = ArticleStatus.PUBLISHED;
    } else if (status === 'all') {
    } else {
      where.status = status as ArticleStatus;
    }

    if (categorySlug) {
      where.category = { slug: categorySlug };
    }

    const articles = await prisma.blogArticle.findMany({
      where,
      include: {
        author: {
          select: { firstName: true, lastName: true, email: true }
        },
        category: true,
        tags: {
          include: { tag: true }
        }
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ articles });
  } catch (err) {
    console.error('GET /api/blog/articles error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch articles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      title, 
      slug, 
      excerpt, 
      content, 
      featuredImage, 
      status, 
      categoryId, 
      authorId,
      tags 
    } = body;

    if (!title || !slug || !content) {
      return NextResponse.json(
        { error: 'Title, slug, and content are required' },
        { status: 400 }
      );
    }

    const existingSlug = await prisma.blogArticle.findUnique({
      where: { slug }
    });

    if (existingSlug) {
      return NextResponse.json(
        { error: 'Article with this slug already exists' },
        { status: 400 }
      );
    }

    const wordCount = content.split(/\s+/).length;
    const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));

    const article = await prisma.blogArticle.create({
      data: {
        title,
        slug,
        excerpt: excerpt || null,
        content,
        featuredImage: featuredImage || null,
        status: status || ArticleStatus.DRAFT,
        publishedAt: status === ArticleStatus.PUBLISHED ? new Date() : null,
        readingTimeMin,
        authorId: authorId || null,
        categoryId: categoryId || null,
      },
      include: {
        author: {
          select: { firstName: true, lastName: true, email: true }
        },
        category: true,
      }
    });

    if (tags && Array.isArray(tags)) {
      for (const tagId of tags) {
        await prisma.articleTag.create({
          data: {
            articleId: article.id,
            tagId
          }
        });
      }
    }

    return NextResponse.json({ article }, { status: 201 });
  } catch (err) {
    console.error('POST /api/blog/articles error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create article' },
      { status: 500 }
    );
  }
}
