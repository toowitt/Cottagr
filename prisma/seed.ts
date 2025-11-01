import { PrismaClient, BookingStatus, ExpenseStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Clear existing data first (respect foreign key order)
  await prisma.expenseAllocation.deleteMany({})
  await prisma.expenseApproval.deleteMany({})
  await prisma.expense.deleteMany({})
  await prisma.bookingVote.deleteMany({})
  await prisma.booking.deleteMany({})
  await prisma.blackout.deleteMany({})
  await prisma.membership.deleteMany({})
  await prisma.invite.deleteMany({})
  await prisma.ownership.deleteMany({})
  await prisma.ownerProfile.deleteMany({})
  await prisma.property.deleteMany({})

  // Create owners for the family group
  const [alex, blair, casey] = await Promise.all([
    prisma.ownerProfile.create({
      data: {
        email: 'alex@blackpoint.family',
        firstName: 'Alex',
        lastName: 'Nguyen',
      },
    }),
    prisma.ownerProfile.create({
      data: {
        email: 'blair@blackpoint.family',
        firstName: 'Blair',
        lastName: 'Singh',
      },
    }),
    prisma.ownerProfile.create({
      data: {
        email: 'casey@blackpoint.family',
        firstName: 'Casey',
        lastName: 'Martin',
      },
    }),
  ])

  // Create Black Point Cottage property and ownership shares
  const property = await prisma.property.create({
    data: {
      name: 'Black Point Cottage',
      slug: 'black-point-cottage',
      location: 'Black Point, Lake Simcoe',
      beds: 3,
      baths: 2,
      description: 'Beautiful lakefront cottage with stunning views and private dock.',
      nightlyRate: 35000, // $350.00 in cents
      cleaningFee: 12000, // $120.00 in cents
      minNights: 2,
      approvalPolicy: 'majority',
      ownerships: {
        create: [
          {
            ownerProfileId: alex.id,
            role: 'PRIMARY',
            shareBps: 4000, // 40%
            votingPower: 2,
          },
          {
            ownerProfileId: blair.id,
            role: 'OWNER',
            shareBps: 3500, // 35%
            votingPower: 1,
          },
          {
            ownerProfileId: casey.id,
            role: 'OWNER',
            shareBps: 2500, // 25%
            votingPower: 1,
          },
        ],
      },
    },
    include: { ownerships: true },
  })

  const [alexShare, blairShare, caseyShare] = property.ownerships

  console.log('Seeded property with ownership group:', {
    property: property.slug,
    owners: property.ownerships.map((o) => ({ ownerProfileId: o.ownerProfileId, shareBps: o.shareBps })),
  })

  // Add blackout for next weekend (Saturday-Sunday)
  const today = new Date()
  const dayOfWeek = today.getDay()
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7 // Next Saturday

  const nextSaturday = new Date(today)
  nextSaturday.setDate(today.getDate() + daysUntilSaturday)

  const nextSunday = new Date(nextSaturday)
  nextSunday.setDate(nextSaturday.getDate() + 2) // Sunday end of day

  await prisma.blackout.create({
    data: {
      propertyId: property.id,
      startDate: nextSaturday,
      endDate: nextSunday,
      reason: 'Seasonal maintenance',
    },
  })

  // Booking #1: Approved family stay initiated by Alex with unanimous approval
  const familyStart = new Date(today.getFullYear(), today.getMonth(), 15)
  const familyEnd = new Date(familyStart)
  familyEnd.setDate(familyStart.getDate() + 3)
  const familyNights = 3
  const familyTotal = familyNights * property.nightlyRate + property.cleaningFee

  const familyBooking = await prisma.booking.create({
    data: {
      propertyId: property.id,
      createdByOwnershipId: alexShare.id,
      startDate: familyStart,
      endDate: familyEnd,
      guestName: 'Nguyen family',
      guestEmail: 'family@nguyen.example',
      requestNotes: 'Summer kick-off family stay.',
      status: BookingStatus.approved,
      decisionSummary: 'Unanimous approval in under 12 hours.',
      totalAmount: familyTotal,
      votes: {
        create: [
          { ownershipId: alexShare.id, choice: 'approve' },
          { ownershipId: blairShare.id, choice: 'approve' },
          { ownershipId: caseyShare.id, choice: 'approve' },
        ],
      },
    },
  })

  // Booking #2: Pending renter request awaiting votes
  const renterStart = new Date(today.getFullYear(), today.getMonth(), 25)
  const renterEnd = new Date(renterStart)
  renterEnd.setDate(renterStart.getDate() + 4)
  const renterNights = 4
  const renterTotal = renterNights * property.nightlyRate + property.cleaningFee

  await prisma.booking.create({
    data: {
      propertyId: property.id,
      createdByOwnershipId: blairShare.id,
      startDate: renterStart,
      endDate: renterEnd,
      guestName: 'The Thompsons',
      guestEmail: 'hello@thompsontravels.example',
      requestNotes: 'Friends-of-family rental inquiry.',
      status: BookingStatus.pending,
      decisionSummary: 'Awaiting Blair and Casey votes (Alex already approved).',
      totalAmount: renterTotal,
      votes: {
        create: [
          { ownershipId: alexShare.id, choice: 'approve', rationale: 'Fits our seasonal rules.' },
        ],
      },
    },
  })

  // Booking #3: Rejected request displaying voting trail
  const rejectedStart = new Date(today.getFullYear(), today.getMonth() + 1, 5)
  const rejectedEnd = new Date(rejectedStart)
  rejectedEnd.setDate(rejectedStart.getDate() + 2)
  const rejectedNights = 2
  const rejectedTotal = rejectedNights * property.nightlyRate + property.cleaningFee

  await prisma.booking.create({
    data: {
      propertyId: property.id,
      createdByOwnershipId: caseyShare.id,
      startDate: rejectedStart,
      endDate: rejectedEnd,
      guestName: 'Last-minute friends',
      guestEmail: 'friends@example.com',
      requestNotes: 'Short notice request overlapping maintenance.',
      status: BookingStatus.rejected,
      decisionSummary: 'Declined due to conflict with annual maintenance weekend.',
      totalAmount: rejectedTotal,
      votes: {
        create: [
          { ownershipId: alexShare.id, choice: 'reject', rationale: 'Conflicts with maintenance.' },
          { ownershipId: blairShare.id, choice: 'reject', rationale: 'Agreed to blackout this window.' },
          { ownershipId: caseyShare.id, choice: 'approve', rationale: 'Happy to host if possible.' },
        ],
      },
    },
  })

  console.log('Seeded bookings with voting trail:', {
    approved: familyBooking.id,
  })

  const splitAmount = (amountCents: number) => {
    const shares = property.ownerships
    let remainder = amountCents
    return shares.map((share, index) => {
      let portion = Math.round((amountCents * share.shareBps) / 10000)
      if (index === shares.length - 1) {
        portion = remainder
      }
      remainder -= portion
      return { ownershipId: share.id, amountCents: portion }
    })
  }

  // Expense #1: Pending firewood invoice awaiting approvals
  await prisma.expense.create({
    data: {
      propertyId: property.id,
      createdByOwnershipId: blairShare.id,
      vendorName: 'Lakefront Firewood Co.',
      category: 'Supplies',
      memo: 'Restocked firewood for spring shoulder season.',
      amountCents: 18500,
      incurredOn: new Date(today.getFullYear(), today.getMonth(), 3),
      status: ExpenseStatus.pending,
      receiptUrl: 'https://example.com/receipts/firewood-spring.pdf',
      approvals: {
        create: [
          { ownershipId: blairShare.id, choice: 'approve', rationale: 'Within shared supplies budget.' },
        ],
      },
      allocations: {
        create: splitAmount(18500),
      },
    },
  })

  // Expense #2: Approved plumbing repair already reimbursed
  await prisma.expense.create({
    data: {
      propertyId: property.id,
      createdByOwnershipId: alexShare.id,
      vendorName: 'Simcoe Plumbing & Drain',
      category: 'Repairs',
      memo: 'Replaced faulty pump and winterized pipes.',
      amountCents: 62500,
      incurredOn: new Date(today.getFullYear(), today.getMonth() - 1, 22),
      status: ExpenseStatus.reimbursed,
      decisionSummary: 'Approved unanimously and reimbursed via March settlement.',
      receiptUrl: 'https://example.com/receipts/plumbing-march.pdf',
      approvals: {
        create: [
          { ownershipId: alexShare.id, choice: 'approve' },
          { ownershipId: blairShare.id, choice: 'approve' },
          { ownershipId: caseyShare.id, choice: 'approve' },
        ],
      },
      allocations: {
        create: splitAmount(62500),
      },
    },
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
