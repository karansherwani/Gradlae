// lib/loadCourses.ts
import fs from "fs";
import path from "path";
import Papa from "papaparse";

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

export function loadAllCourses(): Course[] {
    if (cache) return cache;

    const csvPath = path.join(process.cwd(), "courses-report.2026-01-15.csv");
    const file = fs.readFileSync(csvPath, "utf8");

    const parsed = Papa.parse<RawCSVRow>(file, {
        header: true,
        skipEmptyLines: true,
    });

    if (parsed.errors.length > 5) {
        console.error("CSV parse errors:", parsed.errors.slice(0, 5));
    }

    cache = parsed.data
        .filter((r) => r["Subject code"] && r["Catalog Number"] && r["Course Title"])
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
