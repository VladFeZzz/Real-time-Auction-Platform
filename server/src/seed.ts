import dotenv from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  await prisma.bid.deleteMany();
  await prisma.auction.deleteMany();
  await prisma.user.deleteMany();

  const users = await prisma.user.createMany({
    data: [
      {
        email: 'alice@example.com',
        passwordHash: 'demo-hash-1',
        name: 'Alice Johnson',
        balance: 1500.0,
      },
      {
        email: 'bob@example.com',
        passwordHash: 'demo-hash-2',
        name: 'Bob Smith',
        balance: 2000.0,
      },
      {
        email: 'charlie@example.com',
        passwordHash: 'demo-hash-3',
        name: 'Charlie Brown',
        balance: 3000.0,
      },
    ],
  });

  const createdUsers = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
  });

  const [firstUser, secondUser, thirdUser] = createdUsers;

  if (!firstUser || !secondUser || !thirdUser) {
    throw new Error('Unable to create demo users');
  }

  const now = new Date();

  const auctionOne = await prisma.auction.create({
    data: {
      title: 'Vintage Camera Olympus OM-1',
      description: 'Classic film camera with original lens, great condition.',
      imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32',
      startPrice: 250.0,
      currentPrice: 250.0,
      minStep: 25.0,
      status: 'ACTIVE',
      startsAt: now,
      expiresAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 3),
      creatorId: firstUser.id,
    },
  });

  const auctionTwo = await prisma.auction.create({
    data: {
      title: 'Mechanical Keyboard',
      description: 'Premium switch keyboard for developers and gamers.',
      imageUrl: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae',
      startPrice: 180.0,
      currentPrice: 180.0,
      minStep: 15.0,
      status: 'ACTIVE',
      startsAt: now,
      expiresAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 5),
      creatorId: secondUser.id,
    },
  });

  await prisma.bid.createMany({
    data: [
      {
        auctionId: auctionOne.id,
        userId: secondUser.id,
        amount: 275.0,
      },
      {
        auctionId: auctionOne.id,
        userId: thirdUser.id,
        amount: 300.0,
      },
      {
        auctionId: auctionTwo.id,
        userId: firstUser.id,
        amount: 200.0,
      },
    ],
  });

  const auctionWithWinner = await prisma.auction.update({
    where: { id: auctionOne.id },
    data: {
      currentPrice: 300.0,
      winnerId: thirdUser.id,
      status: 'FINISHED',
    },
  });

  console.log('Seed completed:', {
    users: users.count,
    auctionOne: auctionOne.id,
    auctionTwo: auctionTwo.id,
    finishedAuction: auctionWithWinner.id,
  });
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
