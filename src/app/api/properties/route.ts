
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRouteUserRecord, getAccessiblePropertyIds, RouteAuthError } from '@/lib/auth/routeAuth'

export async function GET() {
  try {
    const userRecord = await getRouteUserRecord()
    const accessiblePropertyIds = getAccessiblePropertyIds(userRecord)

    if (accessiblePropertyIds.size === 0) {
      return NextResponse.json([])
    }

    const properties = await prisma.property.findMany({
      where: { id: { in: Array.from(accessiblePropertyIds) } },
      include: {
        ownerships: {
          include: {
            ownerProfile: {
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
        ownerProfile: ownership.ownerProfile,
      })),
    }))

    return NextResponse.json(payload)
  } catch (error) {
    if (error instanceof RouteAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
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
