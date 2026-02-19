import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/app/lib/mongodb';
import User from '@/app/models/User';

// GET - Retrieve user notes
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        await connectToDatabase();

        const user = await User.findOne({ email: userId.toLowerCase() });

        if (!user) {
            return NextResponse.json({ notes: '' });
        }

        return NextResponse.json({ notes: user.notes || '' });
    } catch (error) {
        console.error('Notes GET error:', error);
        return NextResponse.json(
            { error: 'Failed to retrieve notes' },
            { status: 500 }
        );
    }
}

// PUT - Update user notes
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, notes } = body;

        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        await connectToDatabase();

        await User.findOneAndUpdate(
            { email: userId.toLowerCase() },
            { $set: { notes: notes || '' } },
            { upsert: true, new: true }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Notes PUT error:', error);
        return NextResponse.json(
            { error: 'Failed to update notes' },
            { status: 500 }
        );
    }
}
