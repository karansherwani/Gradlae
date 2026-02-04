import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// GET - Fetch all staff profiles for the student-facing mentoring page
export async function GET() {
    try {
        const staffProfilesPath = path.join(process.cwd(), 'app/data/staff-profiles.json');
        const timeslotsPath = path.join(process.cwd(), 'app/data/timeslots.json');

        // Read staff profiles
        let staffProfiles: any[] = [];
        if (fs.existsSync(staffProfilesPath)) {
            const data = fs.readFileSync(staffProfilesPath, 'utf-8');
            staffProfiles = JSON.parse(data);
        }

        // Read timeslots
        let timeslots: any[] = [];
        if (fs.existsSync(timeslotsPath)) {
            const data = fs.readFileSync(timeslotsPath, 'utf-8');
            timeslots = JSON.parse(data);
        }

        // Transform staff profiles into mentors format for the mentoring page
        const mentors = staffProfiles.map((profile, index) => {
            // Get timeslots for this staff member (only unbooked ones)
            const staffTimeslots = timeslots
                .filter(slot => slot.staffId === profile.staffId && !slot.isBooked)
                .map((slot, slotIndex) => ({
                    id: slotIndex + 1,
                    day: slot.day,
                    date: slot.date,
                    time: slot.time
                }));

            // Generate initials for avatar
            const nameParts = profile.name.split(' ');
            const initials = nameParts.length >= 2
                ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
                : profile.name.substring(0, 2).toUpperCase();

            return {
                id: index + 100, // Start from 100 to avoid conflicts with any hardcoded IDs
                staffId: profile.staffId,
                name: profile.name,
                avatar: initials,
                avatarColor: 'blue' as const,
                rating: 4.8, // Default rating for new mentors
                reviewCount: 0, // Start with 0 reviews
                major: profile.major || 'Staff Member',
                bio: profile.bio || 'Available for tutoring sessions.',
                courses: profile.courses || [],
                slotsAvailable: staffTimeslots.length,
                supportsInPerson: profile.supportsInPerson ?? true,
                supportsOnline: profile.supportsOnline ?? true,
                price: profile.price || 20,
                reviews: [], // New mentors start with no reviews
                timeSlots: staffTimeslots
            };
        });

        // Filter out mentors with no courses or no profile info
        const activeMentors = mentors.filter(m => m.courses.length > 0 || m.bio);

        return NextResponse.json(activeMentors);
    } catch (error) {
        console.error('Error fetching mentors:', error);
        return NextResponse.json({ error: 'Failed to fetch mentors' }, { status: 500 });
    }
}
