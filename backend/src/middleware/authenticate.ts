import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { jwtAudience, jwtIssuer } from '../services/auth.service';

export function createAuthenticationMiddleware(jwtSecret: string): RequestHandler {
  return (request, response, next) => {
    const authorization = request.get('authorization');
    const match = authorization?.match(/^Bearer ([^\s]+)$/);

    if (!match) {
      response.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    let subject: string;
    try {
      const payload = jwt.verify(match[1], jwtSecret, {
        algorithms: ['HS256'],
        audience: jwtAudience,
        issuer: jwtIssuer
      });

      if (
        typeof payload === 'string' ||
        typeof payload.sub !== 'string' ||
        !/^[\da-f]{24}$/i.test(payload.sub)
      ) {
        response.status(401).json({ error: 'Unauthorized.' });
        return;
      }

      subject = payload.sub;
    } catch {
      response.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    request.userId = new ObjectId(subject);
    next();
  };
}
