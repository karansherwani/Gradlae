import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { parseTranscriptText } from '../app/lib/transcriptTextParser';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => readFileSync(join(here, 'fixtures', name), 'utf8');

// Sanitized text produced by the column-aware extraction of a real multi-column
// UAccess unofficial transcript (see scripts/genTranscriptFixture.ts).
const multiColumn = fixture('uaccess-multicolumn.txt');

test('parses every course from a multi-column UAccess transcript', () => {
    const { courses } = parseTranscriptText(multiColumn);
    // 42 rows collapse to 41 unique courses (CSC 210 is taken twice).
    assert.equal(courses.length, 41);
});

test('recovers right-column courses that the old single-column parser dropped', () => {
    const { courses } = parseTranscriptText(multiColumn);
    const codes = new Set(courses.map(c => c.course));
    // These live in the right column of a two-column page and used to be lost.
    for (const code of ['CSC 337', 'DATA 201', 'DATA 375', 'MATH 464', 'CHEM 151']) {
        assert.ok(codes.has(code), `expected ${code} to be parsed`);
    }
});

test('keeps grades intact for recovered courses', () => {
    const { courses } = parseTranscriptText(multiColumn);
    const byCode = new Map(courses.map(c => [c.course, c]));
    assert.equal(byCode.get('CSC 337')?.grade, 'A');
    assert.equal(byCode.get('DATA 201')?.grade, 'C');
    assert.equal(byCode.get('CHEM 151')?.grade, 'A');
});

test('attributes terms per column despite column bleed', () => {
    const { courses } = parseTranscriptText(multiColumn);
    const term = (code: string) => courses.find(c => c.course === code)?.term;
    // Left column terms.
    assert.equal(term('AREC 150C3'), 'Fall 2023');
    assert.equal(term('CSC 244'), 'Fall 2024');
    assert.equal(term('CHEM 151'), 'Spring 2025');
    // Right column terms — the "Spring 2026" header arrives with stray column
    // bleed ("Points Spring 2026") and must still register.
    assert.equal(term('CSC 337'), 'Fall 2025');
    assert.equal(term('DATA 467'), 'Spring 2026');
});

test('marks in-progress (no-grade) rows as IP', () => {
    const { courses } = parseTranscriptText(multiColumn);
    const ip = courses.filter(c => c.grade === 'IP').map(c => c.course);
    for (const code of ['CSC 380', 'MATH 412', 'MATH 475A']) {
        assert.ok(ip.includes(code), `expected ${code} to be in progress`);
    }
});

test('detects retakes and the best grade achieved', () => {
    const { courses } = parseTranscriptText(multiColumn);
    const csc210 = courses.find(c => c.course === 'CSC 210');
    assert.ok(csc210?.isRetake, 'CSC 210 should be flagged as a retake');
    assert.equal(csc210?.bestGrade, 'C');
});

test('strips the "Page N of M" marker from the student name (design choice G1)', () => {
    const { studentInfo } = parseTranscriptText(multiColumn);
    assert.equal(studentInfo.name, 'Test Student');
    assert.equal(studentInfo.studentId, '12345678');
    assert.equal(studentInfo.dateOfBirth, '01/01/2000');
});

test('returns no courses for a non-transcript document', () => {
    const { courses } = parseTranscriptText(fixture('not-a-transcript.txt'));
    assert.equal(courses.length, 0);
});
