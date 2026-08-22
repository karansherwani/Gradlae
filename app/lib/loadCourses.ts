// lib/loadCourses.ts
import fs from "fs";
import path from "path";
import Papa from "papaparse";
import type { Course as GraphCourse, PrerequisiteNode } from "@/types";

// Raw row shape from the CSV (matches column headers exactly)
interface RawCSVRow {
    "Course ID": string;
    "Subject code": string;
    "Catalog Number": string;
    "Offering Unit": string;
    "Course Title": string;
    "Course Description": string;
    "Min Units": string;
    "Max Units": string;
    "Repeatable for Credit": string;
    "Total Completions Allowed": string;
    "Total Units Allowed": string;
    "Grading Basis": string;
    "Components": string;
    "Course Attributes": string;
    "Enrollment Requirements": string;
    "Course Requisites": string;
}

// Normalised shape exposed to the rest of the app
export type Course = {
    courseId: string;
    subject: string;
    catalogNumber: string;
    offeringUnit: string;
    title: string;
    description: string;
    minUnits: number;
    maxUnits: number;
    gradingBasis: string;
    components: string;
    enrollmentRequirements: string;
    courseRequisites: string;
};

let cache: Course[] | null = null;
let graphCache: GraphCourse[] | null = null;

const COURSE_CSV_FILE = "courses.csv";

function normalizeGraphCourseId(subject: string, catalogNumber: string): string {
    return `${subject}-${catalogNumber}`.toUpperCase();
}

function parsePrerequisitePart(part: string): PrerequisiteNode {
    const courseMatch = part.match(/([A-Z]{2,5})\s*(\d{3}[A-Z]*)/i);

    if (courseMatch) {
        return {
            type: "COURSE",
            value: normalizeGraphCourseId(courseMatch[1], courseMatch[2]),
            raw: part,
        };
    }

    return {
        type: "NONE",
        raw: part,
    };
}

function parsePrerequisites(prereqString: string): PrerequisiteNode {
    if (!prereqString || prereqString.trim() === "-" || prereqString.trim() === "") {
        return { type: "NONE" };
    }

    const cleaned = prereqString.trim();

    if (!cleaned.match(/[A-Z]{2,5}\s*\d{3}/i)) {
        return { type: "NONE", raw: cleaned };
    }

    if (cleaned.toLowerCase().includes(" or ")) {
        return {
            type: "OR",
            children: cleaned.split(/\s+or\s+/i).map((part) => parsePrerequisitePart(part.trim())),
            raw: cleaned,
        };
    }

    if (cleaned.includes(",") || cleaned.toLowerCase().includes(" and ")) {
        return {
            type: "AND",
            children: cleaned
                .split(/[,;]|\s+and\s+/i)
                .map((part) => part.trim())
                .filter(Boolean)
                .map((part) => parsePrerequisitePart(part)),
            raw: cleaned,
        };
    }

    return parsePrerequisitePart(cleaned);
}

function readCourseRows(): RawCSVRow[] {
    const csvPath = path.join(process.cwd(), COURSE_CSV_FILE);
    const file = fs.readFileSync(csvPath, "utf8");

    const parsed = Papa.parse<RawCSVRow>(file, {
        header: true,
        skipEmptyLines: true,
    });

    if (parsed.errors.length > 5) {
        console.error("CSV parse errors:", parsed.errors.slice(0, 5));
    }

    return parsed.data.filter((r) => r["Subject code"] && r["Catalog Number"] && r["Course Title"]);
}

export function loadAllCourses(): Course[] {
    if (cache) return cache;

    cache = readCourseRows()
        .map((r) => ({
            courseId: r["Course ID"] || "",
            subject: r["Subject code"].trim(),
            catalogNumber: r["Catalog Number"].trim(),
            offeringUnit: r["Offering Unit"] || "",
            title: r["Course Title"] || "",
            description: r["Course Description"] || "",
            minUnits: parseFloat(r["Min Units"]) || 0,
            maxUnits: parseFloat(r["Max Units"]) || 0,
            gradingBasis: r["Grading Basis"] || "",
            components: r["Components"] || "",
            enrollmentRequirements: r["Enrollment Requirements"] || "",
            courseRequisites: r["Course Requisites"] || "",
        }));

    return cache;
}

export function loadGraphCourses(): GraphCourse[] {
    if (graphCache) return graphCache;

    graphCache = readCourseRows().map((r) => {
        const subjectCode = r["Subject code"].trim();
        const catalogNumber = r["Catalog Number"].trim();

        return {
            id: normalizeGraphCourseId(subjectCode, catalogNumber),
            courseId: parseInt(r["Course ID"], 10) || 0,
            subjectCode,
            catalogNumber,
            title: r["Course Title"]?.trim() || "",
            description: r["Course Description"]?.trim() || "",
            units: {
                min: parseFloat(r["Min Units"]) || 0,
                max: parseFloat(r["Max Units"]) || 0,
            },
            prerequisites: parsePrerequisites(r["Course Requisites"] || r["Enrollment Requirements"] || ""),
            components: (r["Components"] || "")
                .split(",")
                .map((component) => component.trim())
                .filter(Boolean),
            attributes: (r["Course Attributes"] || "")
                .split(",")
                .map((attribute) => attribute.trim())
                .filter((attribute) => attribute && attribute !== "-"),
            offeringUnit: r["Offering Unit"]?.trim() || "",
            gradingBasis: r["Grading Basis"]?.trim() || "",
            repeatable: r["Repeatable for Credit"]?.toLowerCase() === "yes",
            enrollmentRequirements: r["Enrollment Requirements"]?.trim() || undefined,
        };
    });

    return graphCache;
}

export function findCourseByCode(courseCode: string): Course | undefined {
    const normalized = courseCode.replace("-", " ").replace(/\s+/g, " ").trim().toUpperCase();
    return loadAllCourses().find((course) => (
        `${course.subject} ${course.catalogNumber}`.toUpperCase() === normalized ||
        `${course.subject}-${course.catalogNumber}`.toUpperCase() === normalized.replace(" ", "-")
    ));
}
