
import fs from 'fs';
import path from 'path';

const USERS_FILE_PATH = path.join(process.cwd(), 'app/data/users.json');

export interface User {
    id: string;
    authMethod: string;
    identifier: string;
    password?: string;
    fullName?: string;
    studentId?: string;
    takenQuizzes?: string[]; // Array of course IDs (e.g., 'math122b')
}

export function getAllUsers(): User[] {
    try {
        if (!fs.existsSync(USERS_FILE_PATH)) {
            return [];
        }
        const fileContent = fs.readFileSync(USERS_FILE_PATH, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error('Error reading users file:', error);
        return [];
    }
}

export function saveUsers(users: User[]): boolean {
    try {
        fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(users, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing users file:', error);
        return false;
    }
}

export function getUserById(userId: string): User | undefined {
    const users = getAllUsers();
    return users.find(u => u.id === userId);
}

export function markQuizAsTaken(userId: string, courseId: string): boolean {
    const users = getAllUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) return false;

    const user = users[userIndex];
    if (!user.takenQuizzes) {
        user.takenQuizzes = [];
    }

    if (!user.takenQuizzes.includes(courseId)) {
        user.takenQuizzes.push(courseId);
        users[userIndex] = user;
        return saveUsers(users);
    }

    return true;
}

export function hasUserTakenQuiz(userId: string, courseId: string): boolean {
    const user = getUserById(userId);
    return user?.takenQuizzes?.includes(courseId) || false;
}
