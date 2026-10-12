import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db, User, UserRole } from './db.js';

interface Session {
  token: string;
  userId: string;
  role: UserRole;
  createdAt: number;
  expiresAt: number;
}

// Session store
const sessions = new Map<string, Session>();
// Rate limiter store: ip -> { attempts, resetAt }
const rateLimits = new Map<string, { attempts: number; resetAt: number }>();

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function createSession(user: User): string {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  sessions.set(token, {
    token,
    userId: user.id,
    role: user.role,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS
  });
  return token;
}

export function deleteSession(token: string) {
  sessions.delete(token);
}

export function getSession(token: string): Session | null {
  const s = sessions.get(token);
  if (!s) return null;
  if (Date.now() > s.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return s;
}

// Express Request augmentation
export interface AuthenticatedRequest extends Request {
  user?: User;
  sessionToken?: string;
}

// Rate Limiting Middleware for Auth Endpoints
export function authRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const record = rateLimits.get(ip);

  if (record && now < record.resetAt) {
    if (record.attempts >= 10) {
      res.status(429).json({
        success: false,
        error: 'Too many authentication attempts. Please wait 15 minutes before trying again.'
      });
      return;
    }
    record.attempts += 1;
  } else {
    rateLimits.set(ip, { attempts: 1, resetAt: now + 15 * 60 * 1000 });
  }
  next();
}

// Authenticate caller middleware (reads from Authorization Bearer header or shinkafi_session cookie)
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.shinkafi_session) {
    token = req.cookies.shinkafi_session;
  }

  if (token) {
    const session = getSession(token);
    if (session) {
      const user = db.users.get(session.userId);
      if (user && !user.isSuspended) {
        req.user = user;
        req.sessionToken = token;
      }
    }
  }

  next();
}

// Strict requirement middleware
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in to proceed.'
    });
    return;
  }
  next();
}

// Role authorization middleware
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized.' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      db.logAudit(
        req.user.id,
        req.user.role,
        'RBAC_VIOLATION_ATTEMPT',
        'route',
        req.originalUrl,
        `Attempted unauthorized access to restricted role endpoints: ${allowedRoles.join(',')}`
      );
      res.status(403).json({
        success: false,
        error: `Access denied. Requires one of: ${allowedRoles.join(', ')} privileges.`
      });
      return;
    }
    next();
  };
}
