import { promises as fs } from 'fs';
import path from 'path';

interface QuizAttempt {
    userId: string;
    courseNumber: string;
    courseName: string;
    attemptDate: string;
    score: number;
    total: number;
    percentage: number;
    questionsUsed: string[]; // Store question hashes to prevent reuse
}


interface User {
    id: string;
    authMethod: string;
    identifier: string;
    password: string;
    fullName: string;
    studentId?: string;     
    staffId?: string;        
    role?: string;          
}

interface UserQuizData {
    userId: string;
    attempts: QuizAttempt[];
}

const DATA_DIR = path.join(process.cwd(), 'app/data');
const QUIZ_DATA_FILE = path.join(DATA_DIR, 'quiz-attempts.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists
async function ensureDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (error) {
        console.error('Error creating data directory:', error);
    }
}

// Read all quiz data
async function readQuizData(): Promise<UserQuizData[]> {
    await ensureDataDir();
    try {
        const content = await fs.readFile(QUIZ_DATA_FILE, 'utf-8');
        return JSON.parse(content);
    } catch {
        return [];
    }
}

// Write quiz data
async function writeQuizData(data: UserQuizData[]) {
    await ensureDataDir();
    await fs.writeFile(QUIZ_DATA_FILE, JSON.stringify(data, null, 2));
}

// Read users data
async function readUsers(): Promise<User[]> {
    await ensureDataDir();
    try {
        const content = await fs.readFile(USERS_FILE, 'utf-8');
        return JSON.parse(content);
    } catch {
        return [];
    }
}

// Write users data
async function writeUsers(users: User[]) {
    await ensureDataDir();
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

// Find user by identifier (email or netId)
export async function findUser(identifier: string): Promise<User | undefined> {
    const users = await readUsers();
    return users.find(u => u.identifier === identifier);
}

// Find user by unique ID
export async function findUserById(id: string): Promise<User | undefined> {
    const users = await readUsers();
    return users.find(u => u.id === id);
}

// Save new user
export async function saveUser(user: User): Promise<void> {
    const users = await readUsers();
    users.push(user);
    await writeUsers(users);
}

// Update user password
export async function updateUserPassword(identifier: string, newPassword: string): Promise<boolean> {
    const users = await readUsers();
    const userIndex = users.findIndex(u => u.identifier === identifier);

    if (userIndex === -1) {
        return false;
    }

    users[userIndex].password = newPassword;
    await writeUsers(users);
    return true;
}

// Check if user already took quiz for this course
export async function hasUserAttemptedQuiz(userId: string, courseNumber: string): Promise<boolean> {
    const allData = await readQuizData();
    const userData = allData.find(d => d.userId === userId);

    if (!userData) return false;

    return userData.attempts.some(
        attempt => attempt.courseNumber.toUpperCase() === courseNumber.toUpperCase()
    );
}

// Get user's quiz history
export async function getUserQuizHistory(userId: string): Promise<QuizAttempt[]> {
    const allData = await readQuizData();
    const userData = allData.find(d => d.userId === userId);
    return userData?.attempts || [];
}

// Save quiz attempt
export async function saveQuizAttempt(
    userId: string,
    courseNumber: string,
    courseName: string,
    score: number,
    total: number,
    questionsUsed: string[]
): Promise<void> {
    const allData = await readQuizData();
    let userData = allData.find(d => d.userId === userId);

    if (!userData) {
        userData = { userId, attempts: [] };
        allData.push(userData);
    }

    const percentage = Math.round((score / total) * 100);

    userData.attempts.push({
        userId,
        courseNumber: courseNumber.toUpperCase(),
        courseName,
        attemptDate: new Date().toISOString(),
        score,
        total,
        percentage,
        questionsUsed,
    });

    await writeQuizData(allData);
}

// Get all quiz statistics
export async function getAllQuizStats() {
    const allData = await readQuizData();

    return {
        totalUsers: allData.length,
        totalAttempts: allData.reduce((sum, user) => sum + user.attempts.length, 0),
        averageScore: allData.length > 0
            ? Math.round(
                allData.reduce((sum, user) =>
                    sum + user.attempts.reduce((userSum, attempt) => userSum + attempt.percentage, 0),
                    0
                ) / allData.reduce((sum, user) => sum + user.attempts.length, 0)
            )
            : 0,
        userStats: allData.map(user => ({
            userId: user.userId,
            attemptCount: user.attempts.length,
            lastAttempt: user.attempts[user.attempts.length - 1]?.attemptDate,
        })),
    };
}

// Interfaces for Transcript
export interface TranscriptCourse {
    courseNumber: string;
    courseName: string;
    grade: string;
    credits: number;
    term: string;
}

interface UserTranscriptData {
    userId: string;
    courses: TranscriptCourse[];
    updatedAt: string;
}

const TRANSCRIPT_FILE = path.join(DATA_DIR, 'user-transcripts.json');

// Read all transcripts
async function readTranscriptData(): Promise<UserTranscriptData[]> {
    await ensureDataDir();
    try {
        const content = await fs.readFile(TRANSCRIPT_FILE, 'utf-8');
        return JSON.parse(content);
    } catch {
        return [];
    }
}

// Write transcript data
async function writeTranscriptData(data: UserTranscriptData[]) {
    await ensureDataDir();
    await fs.writeFile(TRANSCRIPT_FILE, JSON.stringify(data, null, 2));
}

// Save user transcript
export async function saveUserTranscript(userId: string, courses: TranscriptCourse[]): Promise<void> {
    const allData = await readTranscriptData();
    const existingIndex = allData.findIndex(d => d.userId === userId);

    const newData: UserTranscriptData = {
        userId,
        courses,
        updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
        allData[existingIndex] = newData;
    } else {
        allData.push(newData);
    }

    await writeTranscriptData(allData);
}

// Get user transcript
export async function getUserTranscript(userId: string): Promise<TranscriptCourse[]> {
    const allData = await readTranscriptData();
    const userData = allData.find(d => d.userId === userId);
    return userData?.courses || [];
}
