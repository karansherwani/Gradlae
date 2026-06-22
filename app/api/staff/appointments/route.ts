// CREATE THIS FILE: app/api/staff/appointments/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getUserFromRequest } from '@/app/lib/supabaseAuth';

interface Appointment {
  id: string;
  staffId: string;
  studentName: string;
  studentEmail: string;
  course: string;
  day: string;
  date: string;
  time: string;
  meetingType: 'Online' | 'In-Person';
  status: 'upcoming' | 'completed' | 'cancelled';
  zoomLink?: string;
  location?: string;
  notes?: string;
  createdAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'app/data');
const APPOINTMENTS_FILE = path.join(DATA_DIR, 'appointments.json');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating data directory:', error);
  }
}

// Read all appointments
async function readAppointments(): Promise<Appointment[]> {
  await ensureDataDir();
  try {
    const content = await fs.readFile(APPOINTMENTS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

// Write appointments
async function writeAppointments(appointments: Appointment[]) {
  await ensureDataDir();
  await fs.writeFile(APPOINTMENTS_FILE, JSON.stringify(appointments, null, 2));
}

function isStaffUser(user: { role: string } | null) {
  return user?.role === 'instructor' || user?.role === 'staff';
}

// GET - Fetch appointments for a staff member
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!isStaffUser(user)) {
      return NextResponse.json({ message: 'Forbidden: Staff role required' }, { status: user ? 403 : 401 });
    }

    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staffId');

    if (!staffId || staffId !== user?.id) {
      return NextResponse.json(
        { message: 'Staff ID is invalid' },
        { status: 403 }
      );
    }

    const allAppointments = await readAppointments();
    const staffAppointments = allAppointments.filter(apt => apt.staffId === staffId);

    // Sort by date/time (upcoming first)
    staffAppointments.sort((a, b) => {
      if (a.status === 'upcoming' && b.status !== 'upcoming') return -1;
      if (a.status !== 'upcoming' && b.status === 'upcoming') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({ appointments: staffAppointments });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json(
      { message: 'Failed to fetch appointments' },
      { status: 500 }
    );
  }
}

// POST - Create a new appointment (when student books)
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
      studentEmail, 
      course, 
      day, 
      date, 
      time,
      meetingType,
      zoomLink,
      location,
      notes
    } = body;

    if (!staffId || !studentName || !studentEmail || !day || !date || !time) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (studentEmail.toLowerCase().trim() !== user.email.toLowerCase().trim()) {
      return NextResponse.json({ message: 'Forbidden: Cannot book for another email' }, { status: 403 });
    }

    const allAppointments = await readAppointments();

    const newAppointment: Appointment = {
      id: `apt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      staffId,
      studentName,
      studentEmail,
      course: course || 'General Tutoring',
      day,
      date,
      time,
      meetingType: meetingType || 'Online',
      status: 'upcoming',
      zoomLink: zoomLink || (meetingType === 'Online' ? 'https://zoom.us/j/example' : undefined),
      location: location || (meetingType === 'In-Person' ? 'Main Library, Room 201' : undefined),
      notes,
      createdAt: new Date().toISOString(),
    };

    allAppointments.push(newAppointment);
    await writeAppointments(allAppointments);

    return NextResponse.json({ 
      success: true, 
      appointment: newAppointment 
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json(
      { message: 'Failed to create appointment' },
      { status: 500 }
    );
  }
}
