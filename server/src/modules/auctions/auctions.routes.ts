import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';

const auctionsRouter = Router();

const querySchema = z.object({
  status: z.enum(['ACTIVE', 'FINISHED', 'DRAFT', 'CANCELLED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

const paramsSchema = z.object({
  id: z.string().uuid(),
});

auctionsRouter.get('/', async (request, response) => {
  const parsed = querySchema.safeParse(request.query);

  if (!parsed.success) {
    response.status(400).json({
      message: 'Invalid query parameters',
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { status, page, limit } = parsed.data;
  const where = status ? { status } : {};
  const skip = (page - 1) * limit;

  const [total, auctions] = await Promise.all([
    prisma.auction.count({ where }),
    prisma.auction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        currentPrice: true,
        minStep: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            bids: true,
          },
        },
      },
    }),
  ]);

  const items = auctions.map((auction) => ({
    id: auction.id,
    title: auction.title,
    description: auction.description,
    imageUrl: auction.imageUrl,
    currentPrice: Number(auction.currentPrice),
    minStep: Number(auction.minStep),
    status: auction.status,
    expiresAt: auction.expiresAt,
    createdAt: auction.createdAt,
    bidsCount: auction._count.bids,
    creator: auction.creator,
  }));

  response.json({
    items,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

auctionsRouter.get('/:id', async (request, response) => {
  const parsed = paramsSchema.safeParse(request.params);

  if (!parsed.success) {
    response.status(400).json({
      message: 'Invalid auction id',
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const auction = await prisma.auction.findUnique({
    where: { id: parsed.data.id },
    select: {
      id: true,
      title: true,
      description: true,
      imageUrl: true,
      startPrice: true,
      currentPrice: true,
      minStep: true,
      status: true,
      startsAt: true,
      expiresAt: true,
      createdAt: true,
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
      bids: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          amount: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      _count: {
        select: {
          bids: true,
        },
      },
    },
  });

  if (!auction) {
    response.status(404).json({ message: 'Auction not found' });
    return;
  }

  response.json({
    item: {
      id: auction.id,
      title: auction.title,
      description: auction.description,
      imageUrl: auction.imageUrl,
      startPrice: Number(auction.startPrice),
      currentPrice: Number(auction.currentPrice),
      minStep: Number(auction.minStep),
      status: auction.status,
      startsAt: auction.startsAt,
      expiresAt: auction.expiresAt,
      createdAt: auction.createdAt,
      bidsCount: auction._count.bids,
      creator: auction.creator,
      winner: auction.winner,
      bids: auction.bids.map((bid) => ({
        id: bid.id,
        amount: Number(bid.amount),
        createdAt: bid.createdAt,
        user: bid.user,
      })),
    },
  });
});

export default auctionsRouter;
