import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PublicUser, UserCredentials } from '../models/user';
import { EmailAlreadyRegisteredError, UserService } from './user.service';

const passwordWorkFactor = 12;
export const jwtIssuer = 'worksphere-api';
export const jwtAudience = 'worksphere';

export class InvalidCredentialsError extends Error {}

export interface AuthResult {
  user: PublicUser;
  token: string;
}

export interface AuthService {
  register(credentials: UserCredentials): Promise<AuthResult>;
  login(credentials: UserCredentials): Promise<AuthResult>;
}

export function validateJwtSecret(secret: string | undefined): asserts secret is string {
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('JWT_SECRET must be set to a random value of at least 32 bytes.');
  }
}

export function createAuthService(userService: UserService, jwtSecret: string): AuthService {
  return {
    async register({ email, password }) {
      const passwordHash = await bcrypt.hash(password, passwordWorkFactor);
      const user = await userService.create(email, passwordHash);

      return {
        user: toPublicUser(user),
        token: createToken(user._id.toHexString(), jwtSecret)
      };
    },

    async login({ email, password }) {
      const user = await userService.findByEmail(email);
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        throw new InvalidCredentialsError('Invalid email or password.');
      }

      return {
        user: toPublicUser(user),
        token: createToken(user._id.toHexString(), jwtSecret)
      };
    }
  };
}

function toPublicUser(user: {
  _id: { toHexString(): string };
  email: string;
  createdAt: Date;
}): PublicUser {
  return {
    id: user._id.toHexString(),
    email: user.email,
    createdAt: user.createdAt
  };
}

function createToken(userId: string, secret: string): string {
  return jwt.sign({}, secret, {
    algorithm: 'HS256',
    audience: jwtAudience,
    expiresIn: '15m',
    issuer: jwtIssuer,
    subject: userId
  });
}

export { EmailAlreadyRegisteredError };
