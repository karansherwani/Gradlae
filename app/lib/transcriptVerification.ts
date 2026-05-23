import { StudentInfo } from './transcriptTextParser';

export interface VerificationResult {
    verified: boolean;
    nameMatch: boolean;
    studentIdMatch: boolean;
    dobMatch: boolean;
    message: string;
    extractedInfo: StudentInfo;
}

function normalizeNameForComparison(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function namesMatch(profileName: string, transcriptName: string): boolean {
    if (!profileName || !transcriptName) return false;

    const normalizedProfile = normalizeNameForComparison(profileName);
    const normalizedTranscript = normalizeNameForComparison(transcriptName);

    if (normalizedProfile === normalizedTranscript) return true;

    const profileParts = normalizedProfile.split(' ').filter(p => p.length > 1);
    const transcriptParts = normalizedTranscript.split(' ').filter(p => p.length > 1);

    if (profileParts.length >= 2 && transcriptParts.length >= 2) {
        const profileFirst = profileParts[0];
        const profileLast = profileParts[profileParts.length - 1];
        const transcriptFirst = transcriptParts[0];
        const transcriptLast = transcriptParts[transcriptParts.length - 1];

        if (profileFirst === transcriptFirst && profileLast === transcriptLast) {
            return true;
        }
    }

    let matchCount = 0;
    for (const part of profileParts) {
        if (transcriptParts.includes(part)) matchCount++;
    }

    return matchCount >= 2 || (matchCount >= 1 && profileParts.length === 1);
}

function normalizeDateForComparison(dateStr: string): string {
    if (!dateStr) return '';
    const cleaned = dateStr.trim();

    const usFormat = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (usFormat) {
        return `${usFormat[3]}-${usFormat[1].padStart(2, '0')}-${usFormat[2].padStart(2, '0')}`;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;

    const monthNames: Record<string, string> = {
        'jan': '01', 'january': '01', 'feb': '02', 'february': '02',
        'mar': '03', 'march': '03', 'apr': '04', 'april': '04',
        'may': '05', 'jun': '06', 'june': '06', 'jul': '07', 'july': '07',
        'aug': '08', 'august': '08', 'sep': '09', 'september': '09',
        'oct': '10', 'october': '10', 'nov': '11', 'november': '11',
        'dec': '12', 'december': '12',
    };

    const monthFormat = cleaned.match(/^([a-zA-Z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
    if (monthFormat) {
        const month = monthNames[monthFormat[1].toLowerCase()];
        if (month) {
            return `${monthFormat[3]}-${month}-${monthFormat[2].padStart(2, '0')}`;
        }
    }

    return cleaned;
}

function datesMatch(profileDate: string, transcriptDate: string): boolean {
    if (!profileDate || !transcriptDate) return false;
    return normalizeDateForComparison(profileDate) === normalizeDateForComparison(transcriptDate);
}

export function verifyTranscript(
    studentInfo: StudentInfo,
    profile: { fullName?: string; studentId?: string; dateOfBirth?: string },
): VerificationResult {
    const nameMatch = studentInfo.name ? namesMatch(profile.fullName || '', studentInfo.name) : false;
    const studentIdMatch = studentInfo.studentId ? (profile.studentId === studentInfo.studentId) : false;
    const dobMatch = studentInfo.dateOfBirth ? datesMatch(profile.dateOfBirth || '', studentInfo.dateOfBirth) : false;

    const verified = studentIdMatch ||
        (nameMatch && dobMatch) ||
        (nameMatch && !studentInfo.dateOfBirth);

    let message = '';
    if (verified) {
        message = 'Transcript verified successfully.';
    } else {
        const issues: string[] = [];
        if (studentInfo.name && !nameMatch) issues.push('name does not match');
        if (studentInfo.studentId && !studentIdMatch) issues.push('student ID does not match');
        if (studentInfo.dateOfBirth && !dobMatch) issues.push('date of birth does not match');

        if (issues.length > 0) {
            message = `Warning: Transcript ${issues.join(', ')}. Please verify this is your transcript or update your profile.`;
        } else {
            message = 'Unable to verify transcript ownership. Limited information found in transcript.';
        }
    }

    return { verified, nameMatch, studentIdMatch, dobMatch, message, extractedInfo: studentInfo };
}

export function profileHasVerificationData(profile: {
    name?: string | null;
    student_id?: string | null;
    date_of_birth?: string | null;
} | null): boolean {
    return !!profile && (
        !!profile.name?.trim() ||
        !!profile.student_id?.trim() ||
        !!profile.date_of_birth?.trim()
    );
}
