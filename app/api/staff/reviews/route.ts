// CREATE THIS FILE: app/api/staff/reviews/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getUserFromRequest } from '@/app/lib/supabaseAuth';
import { sanitizeString } from '@/app/lib/validation';

interface Review {
  id: string;
  staffId: string;
  studentName: string;
  course: string;
  rating: number;
  text: string;
  date: string;
  sessionDate: string;
  helpful: number;
}

const DATA_DIR = path.join(process.cwd(), 'app/data');
const REVIEWS_FILE = path.join(DATA_DIR, 'staff-reviews.json');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating data directory:', error);
  }
}

// Read all reviews
async function readReviews(): Promise<Review[]> {
  await ensureDataDir();
  try {
    const content = await fs.readFile(REVIEWS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

// Write reviews
async function writeReviews(reviews: Review[]) {
  await ensureDataDir();
  await fs.writeFile(REVIEWS_FILE, JSON.stringify(reviews, null, 2));
}

// GET - Fetch reviews for a staff member
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staffId');

    if (!staffId) {
      return NextResponse.json(
        { message: 'Staff ID is required' },
        { status: 400 }
      );
    }

    const allReviews = await readReviews();
    const staffReviews = allReviews.filter(review => review.staffId === staffId);

    // Sort by date (most recent first)
    staffReviews.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return NextResponse.json({ reviews: staffReviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { message: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

// POST - Create a new review (when student submits review)
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      staffId, 
      studentName, 
      course, 
      rating, 
      text, 
      sessionDate 
    } = body;

    if (!staffId || !studentName || !rating || !text) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const numericRating = Number(rating);
    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
      return NextResponse.json(
        { message: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    const allReviews = await readReviews();

    const newReview: Review = {
      id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      staffId: sanitizeString(String(staffId)).slice(0, 80),
      studentName: sanitizeString(String(studentName)).slice(0, 100),
      course: sanitizeString(String(course || 'General Tutoring')).slice(0, 100),
      rating: numericRating,
      text: sanitizeString(String(text)).slice(0, 2000),
      date: new Date().toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      }),
      sessionDate: sessionDate || new Date().toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      }),
      helpful: 0,
    };

    allReviews.push(newReview);
    await writeReviews(allReviews);

    return NextResponse.json({ 
      success: true, 
      review: newReview 
    });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { message: 'Failed to create review' },
      { status: 500 }
    );
  }
}
