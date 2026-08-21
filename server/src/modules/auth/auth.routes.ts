import bcrypt from 'bcryptjs';
import { Router, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from './auth.middleware.js';
import {
  createAccessToken,
  createRefreshToken,
  getRefreshTokenExpiry,
  hashToken,
  verifyRefreshToken,
} from './auth.tokens.js';

const authRouter = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

const refreshCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

async function issueRefreshToken(userId: string, response: Response) {
  const refreshToken = createRefreshToken(userId);
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId,
      expiresAt: getRefreshTokenExpiry(),
    },
  });
  response.cookie('refreshToken', refreshToken, refreshCookieOptions);
}

authRouter.post('/register', async (request, response) => {
  const result = registerSchema.safeParse(request.body);

  if (!result.success) {
    response.status(400).json({
      message: 'Invalid registration data',
      errors: result.error.flatten().fieldErrors,
    });
    return;
  }

  const { name, email, password } = result.data;
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    response.status(409).json({ message: 'Email is already registered' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
    select: {
      id: true,
      name: true,
      email: true,
      balance: true,
      createdAt: true,
    },
  });

  await issueRefreshToken(user.id, response);
  response.status(201).json({
    user,
    accessToken: createAccessToken(user.id),
  });
});

authRouter.post('/login', async (request, response) => {
  const result = loginSchema.safeParse(request.body);

  if (!result.success) {
    response.status(400).json({
      message: 'Invalid login data',
      errors: result.error.flatten().fieldErrors,
    });
    return;
  }

  const { email, password } = result.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    response.status(401).json({ message: 'Invalid email or password' });
    return;
  }

  await issueRefreshToken(user.id, response);
  response.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      balance: user.balance,
      createdAt: user.createdAt,
    },
    accessToken: createAccessToken(user.id),
  });
});

authRouter.post('/refresh', async (request, response) => {
  const token = request.cookies?.refreshToken as string | undefined;
  if (!token) {
    response.status(401).json({ message: 'Refresh token is missing' });
    return;
  }

  try {
    const payload = verifyRefreshToken(token);
    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.expiresAt < new Date() ||
      storedToken.userId !== payload.sub
    ) {
      response.status(401).json({ message: 'Refresh token is invalid' });
      return;
    }

    const revokedToken = await prisma.refreshToken.updateMany({
      where: { id: storedToken.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (revokedToken.count !== 1) {
      response.status(401).json({ message: 'Refresh token is invalid' });
      return;
    }
    await issueRefreshToken(storedToken.userId, response);
    const user = await prisma.user.findUnique({
      where: { id: storedToken.userId },
      select: {
        id: true,
        name: true,
        email: true,
        balance: true,
        createdAt: true,
      },
    });
    response.json({ user, accessToken: createAccessToken(storedToken.userId) });
  } catch {
    response.status(401).json({ message: 'Refresh token is invalid' });
  }
});

authRouter.post('/logout', async (request, response) => {
  const token = request.cookies?.refreshToken as string | undefined;
  if (token) {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  response.clearCookie('refreshToken', refreshCookieOptions);
  response.status(204).send();
});

authRouter.get('/me', requireAuth, async (request, response) => {
  const { userId } = request as AuthenticatedRequest;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      balance: true,
      createdAt: true,
    },
  });

  if (!user) {
    response.status(401).json({ message: 'User no longer exists' });
    return;
  }

  response.json({ user });
});

export default authRouter;
