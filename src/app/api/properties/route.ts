
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const properties = await prisma.property.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        location: true,
        nightlyRate: true,
        minNights: true
      }
    })
    return NextResponse.json(properties)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, slug, location, beds, baths, description, nightlyRate, cleaningFee, minNights } = body

    if (!name || !slug || !location) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const property = await prisma.property.create({
      data: {
        name,
        slug,
        location,
        beds: beds || 1,
        baths: baths || 1,
        description,
        nightlyRate: nightlyRate || 0,
        cleaningFee: cleaningFee || 0,
        minNights: minNights || 1
      }
    })

    return NextResponse.json(property, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create property' }, { status: 500 })
  }
}
