import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.warn('Warning: MONGODB_URI not found in environment variables. Using fallback.');
}

interface MongooseCache {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
}

declare global {
    // eslint-disable-next-line no-var
    var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
    global.mongoose = cached;
}

export async function connectToDatabase() {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const uri = MONGODB_URI || 'mongodb://localhost:27017/pacematch';

        cached.promise = mongoose.connect(uri, {
            bufferCommands: false,
        }).then((mongoose) => {
            console.log('Connected to MongoDB');
            return mongoose;
        }).catch((error) => {
            console.error('MongoDB connection error:', error);
            throw error;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
}

export default connectToDatabase;
