
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const properties = await prisma.property.findMany({
      include: {
        ownerships: {
          include: {
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    const payload = properties.map((property) => ({
      id: property.id,
      name: property.name,
      slug: property.slug,
      location: property.location,
      nightlyRate: property.nightlyRate,
      minNights: property.minNights,
      approvalPolicy: property.approvalPolicy,
      ownerships: property.ownerships.map((ownership) => ({
        id: ownership.id,
        role: ownership.role,
        shareBps: ownership.shareBps,
        votingPower: ownership.votingPower,
        owner: ownership.owner,
      })),
    }))

    return NextResponse.json(payload)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      name,
      slug,
      location,
      beds,
      baths,
      description,
      nightlyRate,
      cleaningFee,
      minNights,
      approvalPolicy,
    } = body

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
        minNights: minNights || 1,
        approvalPolicy: approvalPolicy || 'majority'
      }
    })

    return NextResponse.json(property, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create property' }, { status: 500 })
  }
}
