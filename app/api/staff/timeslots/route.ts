// CREATE THIS FILE: app/api/staff/timeslots/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getUserFromRequest } from '@/app/lib/supabaseAuth';

interface TimeSlot {
  id: string;
  staffId: string;
  staffName: string;
  day: string;
  date: string;
  time: string;
  duration: number;
  isBooked: boolean;
  studentName?: string;
  studentEmail?: string;
}

const DATA_DIR = path.join(process.cwd(), 'app/data');
const SLOTS_FILE = path.join(DATA_DIR, 'timeslots.json');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating data directory:', error);
  }
}

// Read all time slots
async function readTimeSlots(): Promise<TimeSlot[]> {
  await ensureDataDir();
  try {
    const content = await fs.readFile(SLOTS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

// Write time slots
async function writeTimeSlots(slots: TimeSlot[]) {
  await ensureDataDir();
  await fs.writeFile(SLOTS_FILE, JSON.stringify(slots, null, 2));
}

function isStaffUser(user: { role: string } | null): boolean {
  return user?.role === 'instructor' || user?.role === 'staff';
}

function publicSlot(slot: TimeSlot): Omit<TimeSlot, 'studentName' | 'studentEmail'> {
  const { studentName, studentEmail, ...safeSlot } = slot;
  void studentName;
  void studentEmail;
  return safeSlot;
}

// GET - Fetch time slots for a staff member
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

    const allSlots = await readTimeSlots();
    const staffSlots = allSlots.filter(slot => slot.staffId === staffId);
    const user = await getUserFromRequest(request);

    if (!user || !isStaffUser(user) || user.id !== staffId) {
      return NextResponse.json({
        slots: staffSlots
          .filter(slot => !slot.isBooked)
          .map(publicSlot),
      });
    }

    return NextResponse.json({ slots: staffSlots });
  } catch (error) {
    console.error('Error fetching time slots:', error);
    return NextResponse.json(
      { message: 'Failed to fetch time slots' },
      { status: 500 }
    );
  }
}

// POST - Create a new time slot
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!isStaffUser(user)) {
      return NextResponse.json({ message: 'Forbidden: Staff role required' }, { status: 403 });
    }

    const body = await request.json();
    const { staffId, staffName, day, date, time, duration } = body;

    if (!staffId || !staffName || !day || !date || !time) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (user?.id !== staffId) {
      return NextResponse.json({ message: 'Forbidden: Cannot create slots for another staff account' }, { status: 403 });
    }

    const allSlots = await readTimeSlots();

    // Check for conflicts
    const conflict = allSlots.find(
      slot => 
        slot.staffId === staffId && 
        slot.date === date && 
        slot.time === time
    );

    if (conflict) {
      return NextResponse.json(
        { message: 'You already have a slot at this time' },
        { status: 409 }
      );
    }

    const newSlot: TimeSlot = {
      id: `slot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      staffId,
      staffName,
      day,
      date,
      time,
      duration: duration || 60,
      isBooked: false,
    };

    allSlots.push(newSlot);
    await writeTimeSlots(allSlots);

    return NextResponse.json({ 
      success: true, 
      slot: newSlot 
    });
  } catch (error) {
    console.error('Error creating time slot:', error);
    return NextResponse.json(
      { message: 'Failed to create time slot' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a time slot
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!isStaffUser(user)) {
      return NextResponse.json({ message: 'Forbidden: Staff role required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const slotId = searchParams.get('slotId');

    if (!slotId) {
      return NextResponse.json(
        { message: 'Slot ID is required' },
        { status: 400 }
      );
    }

    const allSlots = await readTimeSlots();
    const slot = allSlots.find(s => s.id === slotId);

    if (!slot) {
      return NextResponse.json(
        { message: 'Slot not found' },
        { status: 404 }
      );
    }

    if (user?.id !== slot.staffId) {
      return NextResponse.json({ message: 'Forbidden: Cannot delete slots for another staff account' }, { status: 403 });
    }

    if (slot.isBooked) {
      return NextResponse.json(
        { message: 'Cannot delete a booked slot' },
        { status: 400 }
      );
    }

    const updatedSlots = allSlots.filter(s => s.id !== slotId);
    await writeTimeSlots(updatedSlots);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting time slot:', error);
    return NextResponse.json(
      { message: 'Failed to delete time slot' },
      { status: 500 }
    );
  }
}
