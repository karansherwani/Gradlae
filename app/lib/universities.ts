export interface University {
    id: string;
    name: string;
    domain: string;
}

export const UNIVERSITIES: University[] = [
    { id: 'uofa', name: 'University of Arizona', domain: 'arizona.edu' },
    { id: 'asu', name: 'Arizona State University', domain: 'asu.edu' },
    { id: 'nau', name: 'Northern Arizona University', domain: 'nau.edu' },
    { id: 'uofc', name: 'University of Colorado Boulder', domain: 'colorado.edu' },
    { id: 'ucsd', name: 'UC San Diego', domain: 'ucsd.edu' },
    { id: 'stanford', name: 'Stanford University', domain: 'stanford.edu' },
    { id: 'mit', name: 'MIT', domain: 'mit.edu' },
    { id: 'berkeley', name: 'UC Berkeley', domain: 'berkeley.edu' },
];

export function getUniversityById(universityId?: string | null): University | undefined {
    if (!universityId) return undefined;
    return UNIVERSITIES.find((university) => university.id === universityId);
}

export function getUniversityDomain(universityId?: string | null): string {
    const university = getUniversityById(universityId);
    if (university) return university.domain;
    if (universityId) return `${universityId}.edu`;
    return 'arizona.edu';
}

/**
 * Build the NetID email the same way signup does: local-part + selected university domain.
 */
export function buildNetIdEmail(netId: string, universityId?: string | null): string {
    const localPart = netId.toLowerCase().trim();
    return `${localPart}@${getUniversityDomain(universityId)}`;
}

/**
 * Email aliases used during the UArizona beta (@uofa.edu) and any leftover
 * `@${universityId}.edu` addresses created before domains were centralized.
 */
export function getCompatibleEmailCandidates(email: string, universityId?: string | null): string[] {
    const normalized = email.toLowerCase().trim();
    const candidates = [normalized];

    if (normalized.endsWith('@arizona.edu')) {
        candidates.push(normalized.replace('@arizona.edu', '@uofa.edu'));
    }
    if (normalized.endsWith('@uofa.edu')) {
        candidates.push(normalized.replace('@uofa.edu', '@arizona.edu'));
    }

    if (universityId) {
        const legacyDomain = `${universityId.toLowerCase()}.edu`;
        const officialDomain = getUniversityDomain(universityId);
        if (normalized.endsWith(`@${officialDomain}`) && legacyDomain !== officialDomain) {
            candidates.push(normalized.replace(`@${officialDomain}`, `@${legacyDomain}`));
        }
        if (normalized.endsWith(`@${legacyDomain}`) && legacyDomain !== officialDomain) {
            candidates.push(normalized.replace(`@${legacyDomain}`, `@${officialDomain}`));
        }
    }

    return [...new Set(candidates)];
}
