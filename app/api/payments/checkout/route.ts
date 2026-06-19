import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getUserFromRequest } from '@/app/lib/supabaseAuth';
import { checkoutSchema, validateBody } from '@/app/lib/validation';

export const runtime = 'nodejs';

// Session pricing
const PRICING = {
    individual: {
        amount: 2000, // $20 in cents
        name: 'Individual Session',
        description: 'One-on-one mentoring session',
    },
    group: {
        amount: 6000, // $60 in cents
        name: 'Group Session (up to 3 students)',
        description: 'Group mentoring session for up to 3 students',
    },
    pass: {
        amount: 10000, // $100 in cents
        name: '5-Session Pass',
        description: 'Discounted bundle of 5 individual sessions',
    },
};

function cleanEnv(value: string | undefined): string {
    return (value || '').trim().replace(/^['"]|['"]$/g, '');
}

function getBaseUrl(request: NextRequest): string {
    if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
    if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    return request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
    // SECURITY: Require authentication
    const user = await getUserFromRequest(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const stripeSecretKey = cleanEnv(process.env.STRIPE_SECRET_KEY);
        if (!stripeSecretKey) {
            return NextResponse.json(
                { error: 'Stripe is not configured. Add STRIPE_SECRET_KEY in Vercel environment variables.' },
                { status: 500 },
            );
        }

        if (!stripeSecretKey.startsWith('sk_test_') && !stripeSecretKey.startsWith('sk_live_')) {
            console.error('Stripe configuration error: STRIPE_SECRET_KEY must be a secret key starting with sk_test_ or sk_live_.');
            return NextResponse.json(
                { error: 'Stripe is configured with the wrong key type. Use a Stripe secret key that starts with sk_test_ or sk_live_.' },
                { status: 500 },
            );
        }

        const stripe = new Stripe(stripeSecretKey);
        const body = await request.json();
        const validation = validateBody(checkoutSchema, body);
        if (!validation.success) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const { sessionType, mentorName, timeSlot, userEmail } = validation.data;

        const pricing = PRICING[sessionType as keyof typeof PRICING];
        if (!pricing) {
            return NextResponse.json(
                { error: 'Invalid session type' },
                { status: 400 }
            );
        }

        const baseUrl = getBaseUrl(request);

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: pricing.name,
                            description: `${pricing.description} with ${mentorName}${timeSlot ? ` on ${timeSlot}` : ''}`,
                        },
                        unit_amount: pricing.amount,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${baseUrl}/mentoring?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/mentoring?canceled=true`,
            customer_email: userEmail || undefined,
            metadata: {
                sessionType,
                mentorName,
                timeSlot: timeSlot || '',
            },
        });

        return NextResponse.json({
            url: session.url,
            sessionId: session.id,
        });
    } catch (error) {
        console.error('Stripe checkout error:', error);
        const message = error instanceof Error ? error.message : 'Unknown Stripe error';
        if (message.toLowerCase().includes('api key') || message.toLowerCase().includes('invalid')) {
            return NextResponse.json(
                { error: 'Stripe rejected the configured API key. Verify STRIPE_SECRET_KEY in Vercel and redeploy.' },
                { status: 500 },
            );
        }

        return NextResponse.json(
            { error: `Failed to create checkout session: ${message}` },
            { status: 500 }
        );
    }
}
