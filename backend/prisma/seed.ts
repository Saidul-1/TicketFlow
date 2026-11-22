import { PrismaClient, Role, PricingStrategyType, SeatStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting TicketFlow database seeding...');

  // 1. Clean existing records in reverse dependency order
  await prisma.notification.deleteMany();
  await prisma.bookingStatusHistory.deleteMany();
  await prisma.bookingSeat.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.seatTier.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password123!', salt);

  // 2. Create Demo Organizer
  const organizer = await prisma.user.create({
    data: {
      email: 'organizer@ticketflow.com',
      passwordHash,
      fullName: 'Sarah Jenkins (Organizer)',
      role: Role.ORGANIZER,
    },
  });
  console.log(`👤 Created Demo Organizer: ${organizer.email}`);

  // 3. Create Demo Customers
  const customer = await prisma.user.create({
    data: {
      email: 'customer@ticketflow.com',
      passwordHash,
      fullName: 'Alex Rivera (Customer)',
      role: Role.CUSTOMER,
    },
  });
  console.log(`👤 Created Demo Customer: ${customer.email}`);

  const customer2 = await prisma.user.create({
    data: {
      email: 'customer2@ticketflow.com',
      passwordHash,
      fullName: 'Marcus Vance (Customer 2)',
      role: Role.CUSTOMER,
    },
  });
  console.log(`👤 Created Concurrent Demo Customer: ${customer2.email}`);

  // 4. Create Showcase Event 1: Coldplay Tour (with Early Bird Pricing)
  const event1Date = new Date();
  event1Date.setDate(event1Date.getDate() + 14); // 14 days from now

  const event1 = await prisma.event.create({
    data: {
      organizerId: organizer.id,
      title: 'Coldplay: Music of the Spheres World Tour',
      description: 'Experience the magic of Coldplay live in concert with an immersive, sustainable light and music spectacle.',
      venue: 'National Stadium',
      city: 'Dhaka',
      eventDate: event1Date,
      pricingStrategy: PricingStrategyType.EARLY_BIRD,
      totalRows: 5,
      seatsPerRow: 8,
    },
  });

  // Tiers for Event 1
  const vipTier1 = await prisma.seatTier.create({
    data: {
      eventId: event1.id,
      name: 'VIP Front Row',
      basePrice: 150.0,
      fromRow: 1,
      toRow: 2,
    },
  });

  const regularTier1 = await prisma.seatTier.create({
    data: {
      eventId: event1.id,
      name: 'Standard General Admission',
      basePrice: 75.0,
      fromRow: 3,
      toRow: 5,
    },
  });

  // Generate 40 seats (Rows A to E, 1 to 8)
  const rowLetters = ['A', 'B', 'C', 'D', 'E'];
  const seatsData = [];

  for (let r = 0; r < 5; r++) {
    const rowLabel = rowLetters[r];
    const rowNum = r + 1;
    const tierId = rowNum <= 2 ? vipTier1.id : regularTier1.id;

    for (let s = 1; s <= 8; s++) {
      seatsData.push({
        eventId: event1.id,
        seatTierId: tierId,
        rowLabel,
        seatNumber: s,
        status: SeatStatus.AVAILABLE,
        version: 0,
      });
    }
  }

  await prisma.seat.createMany({
    data: seatsData,
  });
  console.log(`🎪 Created Event 1 (${event1.title}) with 40 interactive seats`);

  // 5. Create Showcase Event 2: Tech Horizons Summit (Standard Pricing)
  const event2Date = new Date();
  event2Date.setDate(event2Date.getDate() + 3); // 3 days from now

  const event2 = await prisma.event.create({
    data: {
      organizerId: organizer.id,
      title: 'Tech Horizons AI & Cloud Summit 2026',
      description: 'The premier conference on Artificial Intelligence, distributed computing, and the future of engineering.',
      venue: 'Grand Convention Hall',
      city: 'Chittagong',
      eventDate: event2Date,
      pricingStrategy: PricingStrategyType.STANDARD,
      totalRows: 4,
      seatsPerRow: 6,
    },
  });

  const vipTier2 = await prisma.seatTier.create({
    data: {
      eventId: event2.id,
      name: 'VIP Executive',
      basePrice: 200.0,
      fromRow: 1,
      toRow: 1,
    },
  });

  const regularTier2 = await prisma.seatTier.create({
    data: {
      eventId: event2.id,
      name: 'Regular Delegate',
      basePrice: 99.0,
      fromRow: 2,
      toRow: 4,
    },
  });

  const seatsData2 = [];
  for (let r = 0; r < 4; r++) {
    const rowLabel = rowLetters[r];
    const rowNum = r + 1;
    const tierId = rowNum === 1 ? vipTier2.id : regularTier2.id;

    for (let s = 1; s <= 6; s++) {
      seatsData2.push({
        eventId: event2.id,
        seatTierId: tierId,
        rowLabel,
        seatNumber: s,
        status: SeatStatus.AVAILABLE,
        version: 0,
      });
    }
  }

  await prisma.seat.createMany({
    data: seatsData2,
  });
  console.log(`🎪 Created Event 2 (${event2.title}) with 24 interactive seats`);

  console.log('✅ Seeding completed successfully!');
  console.log('----------------------------------------------------');
  console.log('Demo Credentials:');
  console.log('  Organizer: organizer@ticketflow.com  |  Password: Password123!');
  console.log('  Customer:  customer@ticketflow.com   |  Password: Password123!');
  console.log('  Customer2: customer2@ticketflow.com  |  Password: Password123!');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
