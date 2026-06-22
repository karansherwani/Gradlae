import mongoose, { Schema, Document, Model } from 'mongoose';

// Transcript Course interface
export interface ITranscriptCourse {
    courseNumber: string;
    courseName: string;
    grade: string;
    credits: number;
    term: string;
}

// Grade Component for saved courses
export interface IGradeComponent {
    id: string;
    name: string;
    weight: number;
    score: number | null;
    completed: boolean;
}

// Saved Course for grade calculator
export interface ISavedCourse {
    id: string;
    name: string;
    components: IGradeComponent[];
}

// User Profile interface
export interface IUserProfile {
    fullName: string;
    dateOfBirth: string;
    studentId: string;
    address: string;
    profilePicture: string;
}

// Main User interface
export interface IUser extends Document {
    email: string;
    password?: string;
    authProvider: 'credentials' | 'google';
    profile: IUserProfile;
    transcript: ITranscriptCourse[];
    savedCourses: ISavedCourse[];
    notes: string;
    createdAt: Date;
    updatedAt: Date;
}

// Transcript Course Schema
const TranscriptCourseSchema = new Schema<ITranscriptCourse>({
    courseNumber: { type: String, required: true },
    courseName: { type: String, default: '' },
    grade: { type: String, required: true },
    credits: { type: Number, default: 3 },
    term: { type: String, required: true },
});

// Grade Component Schema
const GradeComponentSchema = new Schema<IGradeComponent>({
    id: { type: String, required: true },
    name: { type: String, required: true },
    weight: { type: Number, default: 0 },
    score: { type: Number, default: null },
    completed: { type: Boolean, default: false },
});

// Saved Course Schema
const SavedCourseSchema = new Schema<ISavedCourse>({
    id: { type: String, required: true },
    name: { type: String, required: true },
    components: [GradeComponentSchema],
});

// User Profile Schema
const UserProfileSchema = new Schema<IUserProfile>({
    fullName: { type: String, default: '' },
    dateOfBirth: { type: String, default: '' },
    studentId: { type: String, default: '' },
    address: { type: String, default: '' },
    profilePicture: { type: String, default: '' },
});

// Main User Schema
const UserSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: false, // Not required for Google OAuth users
        },
        authProvider: {
            type: String,
            enum: ['credentials', 'google'],
            default: 'credentials',
        },
        profile: {
            type: UserProfileSchema,
            default: () => ({}),
        },
        transcript: {
            type: [TranscriptCourseSchema],
            default: [],
        },
        savedCourses: {
            type: [SavedCourseSchema],
            default: [],
        },
        notes: {
            type: String,
            default: '',
        },
    },
    {
        timestamps: true,
    }
);

// Prevent model recompilation in development
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
