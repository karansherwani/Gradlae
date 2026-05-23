// app/lib/validation.ts
// Centralized input validation schemas using Zod.
// Import these in API routes to validate all user input.

import { z } from 'zod';

// ─── SANITIZATION HELPERS ───────────────────────────────────────────────────

/**
 * Strip potentially dangerous characters from user input.
 * This is a defense-in-depth measure — always use Zod validation first.
 */
export function sanitizeString(input: string): string {
    return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/<[^>]*>/g, '')  // Remove HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, '')   // Remove event handlers (onclick=, etc.)
        .trim();
}

/**
 * Validate and sanitize a message intended for LLM/AI endpoints.
 * Limits length and strips dangerous patterns.
 */
export function sanitizeAIInput(input: string, maxLength = 4000): string {
    const truncated = input.slice(0, maxLength);
    return sanitizeString(truncated);
}

// ─── AUTH SCHEMAS ───────────────────────────────────────────────────────────

export const signupSchema = z.object({
    email: z.string().email('Invalid email address').max(254),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password must be at most 128 characters')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    name: z.string().max(100).optional(),
    school: z.string().max(100).optional(),
    role: z.enum(['student', 'instructor', 'staff']).optional(),
});

export const signinSchema = z.object({
    email: z.string().email('Invalid email address').max(254),
    password: z.string().min(1, 'Password is required').max(128),
    role: z.enum(['student', 'instructor', 'staff']).optional(),
});

export const loginSchema = z.object({
    isSignup: z.boolean().optional(),
    email: z.string().email().max(254).optional(),
    password: z.string().min(1).max(128),
    authMethod: z.enum(['email', 'netid', 'staff']).optional(),
    netId: z.string().max(50).optional(),
    staffId: z.string().max(50).optional(),
    university: z.string().max(50).optional(),
    fullName: z.string().max(100).optional(),
});

export const resetSchema = z.object({
    email: z.string().email().max(254).optional(),
    netId: z.string().max(50).optional(),
    staffId: z.string().max(50).optional(),
    newPassword: z
        .string()
        .min(8)
        .max(128)
        .regex(/[a-z]/)
        .regex(/[A-Z]/)
        .regex(/[0-9]/)
        .optional(),
    otp: z.string().max(50).optional(),
});

// ─── CHAT & ADVISOR SCHEMAS ─────────────────────────────────────────────────

export const chatMessageSchema = z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().max(10000, 'Message too long'),
});

export const chatRequestSchema = z.object({
    messages: z.array(chatMessageSchema).min(1).max(50),
    studentProfile: z.object({
        name: z.string().max(100),
        major: z.string().max(100),
        minor: z.string().max(100).optional(),
        currentSemester: z.number().int().min(1).max(20),
        startTerm: z.string().max(20),
        startYear: z.number().int().min(2000).max(2100),
        interests: z.array(z.string().max(100)).optional(),
        careerGoals: z.string().max(500).optional(),
        completedCourses: z.array(z.object({
            courseId: z.string().max(20),
            courseName: z.string().max(200),
            grade: z.string().max(5),
            units: z.number().min(0).max(20),
        })),
    }),
});

export const advisorRequestSchema = z.object({
    messages: z.array(chatMessageSchema).min(1).max(50),
    studentContext: z.string().max(20000).optional(),
});

// ─── QUIZ SCHEMAS ───────────────────────────────────────────────────────────

export const generateQuizSchema = z.object({
    courseNumber: z.string().max(20),
    courseName: z.string().max(200),
});

// ─── STAFF SCHEMAS ──────────────────────────────────────────────────────────

export const staffProfileSchema = z.object({
    staffId: z.string().min(1).max(50),
    name: z.string().max(100).optional(),
    avatar: z.string().max(500).optional(),
    major: z.string().max(100).optional(),
    bio: z.string().max(2000).optional(),
    courses: z.array(z.string().max(50)).max(50).optional(),
    price: z.number().min(0).max(10000).optional(),
    supportsInPerson: z.boolean().optional(),
    supportsOnline: z.boolean().optional(),
    email: z.string().email().max(254).optional(),
    phone: z.string().max(20).optional(),
    officeHours: z.string().max(500).optional(),
    specializations: z.array(z.string().max(100)).max(20).optional(),
});

// ─── PAYMENT SCHEMAS ────────────────────────────────────────────────────────

export const checkoutSchema = z.object({
    sessionType: z.enum(['individual', 'group', 'pass']),
    mentorName: z.string().min(1).max(100),
    timeSlot: z.string().max(100).optional(),
    userEmail: z.string().email().max(254).optional(),
});

// ─── VALIDATION HELPER ──────────────────────────────────────────────────────

/**
 * Validate request body against a Zod schema.
 * Returns { success: true, data } or { success: false, error }.
 */
export function validateBody<T>(
    schema: z.ZodSchema<T>,
    body: unknown,
): { success: true; data: T } | { success: false; error: string } {
    const result = schema.safeParse(body);
    if (!result.success) {
        const firstError = result.error.issues[0];
        return {
            success: false,
            error: firstError
                ? `${firstError.path.join('.')}: ${firstError.message}`
                : 'Validation failed',
        };
    }
    return { success: true, data: result.data };
}
