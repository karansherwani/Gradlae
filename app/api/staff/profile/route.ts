// CREATE THIS FILE: app/api/staff/profile/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

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

// GET - Fetch a staff member's profile
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
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { staffId, ...profileData } = body;

    if (!staffId) {
      return NextResponse.json(
        { message: 'Staff ID is required' },
        { status: 400 }
      );
    }

    const allProfiles = await readProfiles();
    const existingIndex = allProfiles.findIndex(p => p.staffId === staffId);

    const updatedProfile: StaffProfile = {
      staffId,
      ...profileData,
    };

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

// GET all profiles (for the Book a Session page)
export async function GET_ALL() {
  try {
    const allProfiles = await readProfiles();
    return NextResponse.json({ profiles: allProfiles });
  } catch (error) {
    console.error('Error fetching profiles:', error);
    return NextResponse.json(
      { message: 'Failed to fetch profiles' },
      { status: 500 }
    );
  }
}