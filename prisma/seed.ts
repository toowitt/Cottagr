
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Clear existing data first
  await prisma.booking.deleteMany({});
  await prisma.blackout.deleteMany({});
  await prisma.property.deleteMany({});

  // Create Black Point Cottage property
  const property = await prisma.property.upsert({
    where: { slug: 'black-point-cottage' },
    update: {
      name: 'Black Point Cottage',
      location: 'Black Point, Lake Simcoe',
      beds: 3,
      baths: 2,
      description: 'Beautiful lakefront cottage with stunning views and private dock.',
      nightlyRate: 35000, // $350.00 in cents
      cleaningFee: 12000, // $120.00 in cents
      minNights: 2,
      photos: [
        'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
        'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800',
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
        'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?w=800'
      ]
    },
    create: {
      name: 'Black Point Cottage',
      slug: 'black-point-cottage',
      location: 'Black Point, Lake Simcoe',
      beds: 3,
      baths: 2,
      description: 'Beautiful lakefront cottage with stunning views and private dock.',
      nightlyRate: 35000, // $350.00 in cents
      cleaningFee: 12000, // $120.00 in cents
      minNights: 2,
      photos: [
        'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
        'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800',
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
        'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?w=800'
      ]
    },
  })

  console.log('Created/updated property:', property)

  // Add blackout for next weekend (Saturday-Sunday)
  const today = new Date()
  const dayOfWeek = today.getDay()
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7 // Next Saturday
  
  const nextSaturday = new Date(today)
  nextSaturday.setDate(today.getDate() + daysUntilSaturday)
  
  const nextSunday = new Date(nextSaturday)
  nextSunday.setDate(nextSaturday.getDate() + 2) // Sunday end of day
  
  const blackout = await prisma.blackout.create({
    data: {
      propertyId: property.id,
      startDate: nextSaturday,
      endDate: nextSunday,
      reason: 'Owner weekend stay',
    },
  })

  console.log('Created blackout:', blackout)

  // Add confirmed booking for current month
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const bookingStart = new Date(currentMonth)
  bookingStart.setDate(15) // Mid-month booking
  
  const bookingEnd = new Date(bookingStart)
  bookingEnd.setDate(bookingStart.getDate() + 3) // 3-night stay
  
  // Calculate total: 3 nights * $350 + $120 cleaning = $1170
  const nights = 3
  const totalAmount = nights * property.nightlyRate + property.cleaningFee

  const booking = await prisma.booking.create({
    data: {
      propertyId: property.id,
      startDate: bookingStart,
      endDate: bookingEnd,
      guestName: 'Jane Doe',
      guestEmail: 'jane.doe@example.com',
      status: 'confirmed',
      totalAmount: totalAmount,
    },
  })

  console.log('Created booking:', booking)
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
