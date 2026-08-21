import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from 'node:crypto';

type JwtExpiresIn = Exclude<SignOptions['expiresIn'], undefined>;

function getJwtSecret() {
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET is not defined');
  }

  return secret;
}

export function createAccessToken(userId: string) {
  const expiresInValue = process.env.JWT_ACCESS_EXPIRES_IN;
  const options: SignOptions = expiresInValue
    ? { expiresIn: expiresInValue as JwtExpiresIn }
    : {};

  return jwt.sign({ sub: userId }, getJwtSecret(), options);
}

export function createRefreshToken(userId: string) {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is not defined');
  }

  return jwt.sign({ sub: userId, jti: crypto.randomUUID() }, secret, {
    expiresIn: '7d',
  });
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function getRefreshTokenExpiry() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

export function verifyRefreshToken(token: string) {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is not defined');
  }

  return jwt.verify(token, secret) as jwt.JwtPayload & { sub: string };
}
