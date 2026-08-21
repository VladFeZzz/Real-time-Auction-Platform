import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import { prisma } from './lib/prisma.js';
import authRouter from './modules/auth/auth.routes.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 5000);

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRouter);

app.get('/', (_request, response) => {
  response.json({
    message: 'Auction Platform API is running',
    health: '/api/health',
    auctions: '/api/auctions',
  });
});

app.get('/api/health', async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    response.json({
      status: 'ok',
      service: 'auction-platform-api',
      database: 'connected',
    });
  } catch (error) {
    response.status(500).json({
      status: 'error',
      service: 'auction-platform-api',
      database: 'disconnected',
      message:
        error instanceof Error ? error.message : 'Unknown database error',
    });
  }
});

app.get('/api/auctions', async (_request, response) => {
  const auctions = await prisma.auction.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
        },
      },
      winner: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    take: 20,
  });

  response.json(auctions);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
