import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getUserFromRequest } from '@/app/lib/supabaseAuth';
import { checkoutSchema, validateBody } from '@/app/lib/validation';

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

export async function POST(request: NextRequest) {
    // SECURITY: Require authentication
    const user = await getUserFromRequest(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
    try {
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
            success_url: `${process.env.NEXTAUTH_URL}/mentoring?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXTAUTH_URL}/mentoring?canceled=true`,
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
        return NextResponse.json(
            { error: 'Failed to create checkout session' },
            { status: 500 }
        );
    }
}
