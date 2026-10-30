import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { z } from 'zod';
import type { SessionUser, UserRole } from '@/types/scamtrace';

export const SignupSchema = z
  .object({
    fullName: z
      .string()
      .min(2, 'Full name must be at least 2 characters')
      .max(80, 'Full name cannot exceed 80 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must include at least one uppercase letter')
      .regex(/[a-z]/, 'Password must include at least one lowercase letter')
      .regex(/[0-9]/, 'Password must include at least one number'),
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({
        message: 'You must accept the Responsible Use & Security Terms',
      }),
    }),
    role: z
      .enum(['INVESTIGATOR', 'VIEWER'])
      .optional()
      .default('INVESTIGATOR'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const SESSION_COOKIE_NAME = 'scamtrace_session';

function getSecretKey(): Uint8Array {
  const secret =
    process.env.SESSION_SECRET ||
    'scamtrace-enterprise-session-secret-key-2026-dev-only';
  return new TextEncoder().encode(secret);
}

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, 10);
}

export async function verifyPassword(
  plainPassword: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hash);
}

export async function createSessionToken(
  user: SessionUser,
  rememberMe = false
): Promise<string> {
  const expirationTime = rememberMe ? '30d' : '24h';
  return new SignJWT({
    sub: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    department: user.department,
    avatarColor: user.avatarColor,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (!payload.sub || !payload.email || !payload.role) {
      return null;
    }
    return {
      id: String(payload.sub),
      email: String(payload.email),
      fullName: String(payload.fullName || 'Investigator'),
      role: String(payload.role) as UserRole,
      department: String(payload.department || 'Threat Operations'),
      avatarColor: String(payload.avatarColor || '#4F46E5'),
    };
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

const ROLE_HIERARCHY: Record<UserRole, number> = {
  VIEWER: 1,
  INVESTIGATOR: 2,
  ADMINISTRATOR: 3,
};

export function hasRequiredRole(
  userRole: UserRole,
  minimumRole: UserRole
): boolean {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[minimumRole] ?? 99);
}

export function canPerformAction(
  userRole: UserRole,
  action:
    | 'VIEW_PLATFORM'
    | 'RUN_ANALYSIS'
    | 'CREATE_REPORT'
    | 'EDIT_REPORT'
    | 'CREATE_CASE'
    | 'UPDATE_CASE'
    | 'ADD_EVIDENCE'
    | 'EXPORT_DATA'
    | 'MANAGE_RULES'
    | 'MANAGE_USERS'
): boolean {
  switch (action) {
    case 'VIEW_PLATFORM':
    case 'RUN_ANALYSIS':
      return hasRequiredRole(userRole, 'VIEWER');
    case 'CREATE_REPORT':
    case 'EDIT_REPORT':
    case 'CREATE_CASE':
    case 'UPDATE_CASE':
    case 'ADD_EVIDENCE':
    case 'EXPORT_DATA':
      return hasRequiredRole(userRole, 'INVESTIGATOR');
    case 'MANAGE_RULES':
    case 'MANAGE_USERS':
      return hasRequiredRole(userRole, 'ADMINISTRATOR');
    default:
      return false;
  }
}

