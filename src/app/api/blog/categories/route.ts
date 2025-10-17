import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const categories = await prisma.blogCategory.findMany({
      include: {
        _count: {
          select: { articles: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ categories });
  } catch (err) {
    console.error('GET /api/blog/categories error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug, description, color, icon } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    const existingSlug = await prisma.blogCategory.findUnique({
      where: { slug }
    });

    if (existingSlug) {
      return NextResponse.json(
        { error: 'Category with this slug already exists' },
        { status: 400 }
      );
    }

    const category = await prisma.blogCategory.create({
      data: {
        name,
        slug,
        description: description || null,
        color: color || '#10b981',
        icon: icon || null
      }
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (err) {
    console.error('POST /api/blog/categories error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create category' },
      { status: 500 }
    );
  }
}
