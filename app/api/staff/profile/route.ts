// CREATE THIS FILE: app/api/staff/profile/route.ts
// SECURITY: POST requires authentication + role check.

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getUserFromRequest } from '@/app/lib/supabaseAuth';
import { staffProfileSchema, validateBody } from '@/app/lib/validation';

interface StaffProfile {
  staffId: string;
  name: string;
  avatar: string;
  major: string;
  bio: string;
  courses: string[];
  price: number;
  supportsInPerson: boolean;
  supportsOnline: boolean;
  email: string;
  phone?: string;
  officeHours?: string;
  specializations?: string[];
  rating?: number;
  reviewCount?: number;
}

const DATA_DIR = path.join(process.cwd(), 'app/data');
const PROFILES_FILE = path.join(DATA_DIR, 'staff-profiles.json');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating data directory:', error);
  }
}

// Read all profiles
async function readProfiles(): Promise<StaffProfile[]> {
  await ensureDataDir();
  try {
    const content = await fs.readFile(PROFILES_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

// Write profiles
async function writeProfiles(profiles: StaffProfile[]) {
  await ensureDataDir();
  await fs.writeFile(PROFILES_FILE, JSON.stringify(profiles, null, 2));
}

// GET - Fetch a staff member's profile (public)
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

    const allProfiles = await readProfiles();
    const profile = allProfiles.find(p => p.staffId === staffId);

    return NextResponse.json({ profile: profile || null });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { message: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

// POST - Create or update a staff profile
// SECURITY: Requires authentication + staff/instructor role
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Role check — only staff/instructors can create profiles
    if (user.role !== 'instructor' && user.role !== 'staff') {
      return NextResponse.json({ message: 'Forbidden: Staff role required' }, { status: 403 });
    }

    // Validate input
    const body = await request.json();
    const validation = validateBody(staffProfileSchema, body);
    if (!validation.success) {
      return NextResponse.json({ message: validation.error }, { status: 400 });
    }

    const { staffId, ...profileData } = validation.data;

    const allProfiles = await readProfiles();
    const existingIndex = allProfiles.findIndex(p => p.staffId === staffId);

    const updatedProfile = {
      staffId,
      ...profileData,
    } as StaffProfile;

    if (existingIndex >= 0) {
      // Update existing profile
      allProfiles[existingIndex] = updatedProfile;
    } else {
      // Create new profile
      allProfiles.push(updatedProfile);
    }

    await writeProfiles(allProfiles);

    return NextResponse.json({ 
      success: true, 
      profile: updatedProfile 
    });
  } catch (error) {
    console.error('Error saving profile:', error);
    return NextResponse.json(
      { message: 'Failed to save profile' },
      { status: 500 }
    );
  }
}