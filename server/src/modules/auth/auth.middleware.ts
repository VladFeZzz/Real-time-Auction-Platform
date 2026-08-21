import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export type AuthenticatedRequest = Request & {
  userId: string;
};

function getAccessSecret() {
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET is not defined');
  }

  return secret;
}

export function requireAuth(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const authorization = request.headers.authorization;
  const [scheme, token] = authorization?.split(' ') ?? [];

  if (scheme !== 'Bearer' || !token) {
    response.status(401).json({ message: 'Authorization token is required' });
    return;
  }

  try {
    const payload = jwt.verify(token, getAccessSecret());

    if (typeof payload !== 'object' || typeof payload.sub !== 'string') {
      response.status(401).json({ message: 'Authorization token is invalid' });
      return;
    }

    (request as AuthenticatedRequest).userId = payload.sub;
    next();
  } catch {
    response
      .status(401)
      .json({ message: 'Authorization token is invalid or expired' });
  }
}
