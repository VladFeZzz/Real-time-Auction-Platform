import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { createAccessToken } from './auth.tokens.js';

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

export default authRouter;
