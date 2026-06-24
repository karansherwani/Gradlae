// Deprecated compatibility endpoint.
// The active auth flow uses /api/auth/signin and /api/auth/signup.

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { message: 'This login endpoint has been retired. Please use /api/auth/signin or /api/auth/signup.' },
    { status: 410 },
  );
}
