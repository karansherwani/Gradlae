import { GoogleGenerativeAI } from "@google/generative-ai";
import crypto from 'crypto';

export interface QuizQuestion {
    id: number;
    question: string;
    options: string[];
    correct: number;
    explanation: string;
    hash: string; // To track question uniqueness
}

export interface GeneratedQuiz {
    courseNumber: string;
    courseName: string;
    questions: QuizQuestion[];
    generationSeed: string;
}

function cleanEnv(value: string | undefined): string {
    return (value || '').trim().replace(/^['"]|['"]$/g, '');
}

function getGeminiClient(): GoogleGenerativeAI {
    const apiKey = cleanEnv(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    if (!apiKey) {
        throw new Error('Gemini API key is not configured');
    }
    return new GoogleGenerativeAI(apiKey);
}

// Generate a unique seed for this user/course combination
function generateQuizSeed(userId: string, courseNumber: string, attemptNumber: number = 1): string {
    const seedData = `${userId}-${courseNumber.toUpperCase()}-${attemptNumber}-${Math.random()}`;
    return crypto.createHash('sha256').update(seedData).digest('hex').slice(0, 16);
}

export async function generateQuizForCourse(
    userId: string,
    courseNumber: string,
    courseName: string,
    attemptNumber: number = 1
): Promise<GeneratedQuiz> {
    try {
        const seed = generateQuizSeed(userId, courseNumber, attemptNumber);
        const genAI = getGeminiClient();
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const difficultyHint = {
            easy: "fundamental concepts, basic definitions, and simple problems",
            medium: "intermediate application, core theorems, and standard course problems",
            hard: "advanced application, complex scenario analysis, and edge cases"
        };

        const prompt = `You are a university professor creating a rigid prerequisite assessment quiz.
The goal is to verify if a student possesses the ACTUAL technical knowledge from ${courseNumber} - ${courseName} required for the next level.

RANDOM SEED: ${seed}

Generate exactly 10 UNIQUE multiple-choice questions.

CRITICAL REQUIREMENTS:
1. SUBJECT MATTER: Every question MUST be a technical problem-solving question or a core concept check from ${courseNumber} - ${courseName}.
2. NO META QUESTIONS: Do not ask about the course name, study habits, or importance. Ask about formulas, logic, and subject-specific content.
3. FORMAT: Return ONLY valid JSON as specified.
4. PLAIN TEXT ONLY: Do NOT use LaTeX, MathJax, or any special math formatting. Write all math expressions in plain readable text.
   - Instead of "$\\sqrt{21}$" write "√21" or "sqrt(21)"
   - Instead of "$\\frac{1}{2}$" write "1/2"
   - Instead of "$x^2$" write "x²" or "x^2"
   - Instead of "$\\theta$" write "θ" or "theta"
   - Instead of "$\\mathbf{v}$" write "v" (just the letter)
   - Use Unicode symbols: ² ³ √ π θ ∫ ∑ ∞ ≤ ≥ ≠ ± × ÷

RESPONSE FORMAT (JSON ONLY):
{
  "questions": [
    {
      "id": 1,
      "question": "Subject-specific technical question here?",
      "options": ["Correct Option", "Distractor 1", "Distractor 2", "Distractor 3"],
      "correct": 0,
      "explanation": "Brief explanation of the technical concept"
    }
  ]
}

For MATH: Focus on calculus, algebra, or proofs as relevant. Write expressions in plain text.
For CS: Focus on algorithms, syntax, or logic.
For SCIENCES: Focus on laws, formulas, and observations.`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Clean up response
        let cleanedText = responseText
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();

        // Try to find JSON in the response
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleanedText = jsonMatch[0];
        } else {
            console.error('No JSON found in AI response');
            throw new Error('No JSON found in AI response');
        }

        let parsedQuestions;
        try {
            parsedQuestions = JSON.parse(cleanedText);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            throw new Error('Failed to parse AI response as JSON');
        }

        if (!parsedQuestions.questions || !Array.isArray(parsedQuestions.questions)) {
            console.error('Invalid AI response structure: missing questions array');
            throw new Error('Invalid response structure from AI: missing questions array');
        }

        console.log('Generated quiz questions:', parsedQuestions.questions.length);

        // Validate each question has required fields
        const validatedQuestions: QuizQuestion[] = parsedQuestions.questions.map(
            (q: QuizQuestion, idx: number) => {
                const hasOptions = q.options && Array.isArray(q.options);
                if (!q.question || !hasOptions || q.options.length !== 4 || q.correct === undefined || !q.explanation) {
                    console.error(`Question ${idx + 1} validation failed:`, {
                        hasQuestion: !!q.question,
                        hasOptions: hasOptions,
                        optionsLength: hasOptions ? q.options.length : 'N/A',
                        hasCorrect: q.correct !== undefined,
                        hasExplanation: !!q.explanation
                    });
                    throw new Error(`Question ${idx + 1} is missing required fields`);
                }

                const questionHash = crypto
                    .createHash('sha256')
                    .update(q.question + q.options.join(''))
                    .digest('hex')
                    .slice(0, 12);

                return {
                    id: idx + 1,
                    question: q.question,
                    options: q.options,
                    correct: q.correct,
                    explanation: q.explanation,
                    hash: questionHash,
                };
            }
        );

        return {
            courseNumber,
            courseName,
            questions: validatedQuestions,
            generationSeed: seed,
        };
    } catch (error) {
        console.error('Quiz generation error:', error);
        throw new Error(`Failed to generate quiz: ${(error as Error).message}`);
    }
}
