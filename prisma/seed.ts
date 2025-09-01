
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create a sample property
  const property = await prisma.property.create({
    data: {
      name: 'Black Point Cottage',
      slug: 'black-point-cottage',
      location: 'Black Point, Lake Simcoe',
      beds: 3,
      baths: 2,
      description: 'Beautiful lakefront cottage with stunning views and private dock.',
      nightlyRate: 25000, // $250.00 in cents
      cleaningFee: 7500,  // $75.00 in cents
      minNights: 2,
    },
  })

  console.log('Created property:', property)

  // Create two sample bookings
  const booking1 = await prisma.booking.create({
    data: {
      propertyId: property.id,
      startDate: new Date('2024-07-15'),
      endDate: new Date('2024-07-20'),
      guestName: 'John Smith',
      guestEmail: 'john.smith@example.com',
      status: 'confirmed',
      totalAmount: 132500, // 5 nights * $250 + $75 cleaning fee = $1325.00
    },
  })

  const booking2 = await prisma.booking.create({
    data: {
      propertyId: property.id,
      startDate: new Date('2024-08-10'),
      endDate: new Date('2024-08-14'),
      guestName: 'Sarah Johnson',
      guestEmail: 'sarah.johnson@example.com',
      status: 'pending',
      totalAmount: 107500, // 4 nights * $250 + $75 cleaning fee = $1075.00
    },
  })

  console.log('Created bookings:', { booking1, booking2 })
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
