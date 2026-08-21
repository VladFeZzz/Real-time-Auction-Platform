import jwt, { type SignOptions } from 'jsonwebtoken';

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
