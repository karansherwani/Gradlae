# Transcript PDF Parser — Redesign Notes

This document accompanies the transcript-uploader improvement work. It records the
design choices we committed to, **where problems may still exist**, **what needs
extensive testing**, and the **future development plan**. Items tagged
`MARKED FOR TESTING` are deliberate heuristics we chose to ship now and revisit.

## Background: what was broken

The My Courses uploader (`app/placements/page.tsx`) extracted PDF text with
`extractPdfTextInBrowser`, which joins every PDF text fragment with newlines.
On a real UAccess unofficial transcript this shatters each course row into
single tokens, so `parseTranscriptText` matched **0 courses** and the user saw
_"I could not find course rows in this PDF."_ — even though the PDF was a valid,
text-based transcript.

Contributing problems:

1. My Courses never used the layout-aware extractor that already existed.
2. UAccess continuation pages are **two columns**; the single-column layout
   extractor merged them, so right-column courses were dropped and terms leaked.
3. The parser only matched one course per line and required a trailing Points
   value, so any column bleed dropped rows.
4. The header-skip and term regex were too aggressive, discarding valid rows and
   mis-attributing terms.
5. The student name captured `"Karan Kumar Page"` from the `Name: … Page N of M`
   header, which feeds ownership verification.

## Pipeline after the change

```
File (PDF)
  └─ parseTranscriptFromPdf()            app/lib/transcriptPdf.ts   (A2, F2)
       ├─ extractTranscriptLayoutInBrowser()  browserPdfText.ts     (B2+B1, D3-via-linearization)
       ├─ extractPdfTextInBrowser()           browserPdfText.ts     (fallback candidate)
       ├─ parseTranscriptText() on each        transcriptTextParser.ts (C2/C1, term logic, G1)
       └─ score both, keep the best + return signal metadata
  └─ caller shows results OR describeTranscriptFailure(meta)        (F2)
```

Both call sites — `app/placements/page.tsx` and `app/components/AdvisorChat.tsx`
— now go through the single shared helper, so they can no longer drift apart.

## Design choices as implemented

| Choice | Decision | Where |
| --- | --- | --- |
| **A – extraction strategy** | **A2**: run column-aware layout **and** naive extraction, parse both, keep the higher-scoring result (`score = courses×10 + distinctTerms×3 + gradedRows`). | `transcriptPdf.ts` |
| **B – column handling** | **B2** valley detection (coverage histogram) **sanity-checked with B1** (separator must be near the page midpoint with dense content on both sides). | `browserPdfText.ts:detectColumnSplit` |
| **C – multi-course lines** | **C2** primary (columns are split before parsing) with **C1** fallback (`matchAll` recovers a second course from any still-merged line). | `transcriptTextParser.ts` |
| **D – term tracking** | **D3** by proximity, realized via **column linearization**: each column is emitted top-to-bottom (term header before its own courses) so the string parser attributes the nearest preceding term. | `browserPdfText.ts:layoutItemsToText` |
| **E – parser interface** | **E1**: parser stays `parseTranscriptText(text: string)`; all column/term intelligence lives upstream in extraction. | unchanged signature |
| **F – failure UX** | **F2** tiered messages from signal metadata (no text → scan; text but no markers → wrong document; markers but no rows → unusual layout). | `transcriptPdf.ts:describeTranscriptFailure` |
| **G – name extraction** | **G1**: strip `Page N of M` / trailing noise from the captured name. | `transcriptTextParser.ts:sanitizeName` |
| **H – testing** | **H2**: fixture-based unit tests via `node:test` + `tsx` (`npm test`). Fixtures are sanitized extracted text, never the source PDF. | `tests/` |

### Result on the reference transcript

The reference PDF went from **0 → 41 courses** (all 42 rows; CSC 210 collapses to
one retake entry). Terms are correct for every term except one genuinely
mis-positioned row (see below).

## Where problems may still exist

- **Column detection is heuristic (B).** `detectColumnSplit` looks for a central
  low-density "valley" in a horizontal coverage histogram. It is tuned to
  UAccess and can, in principle:
  - land the separator inside a column (e.g. between the single-character
    *Grade* column and *Points*). We made this **harmless** by not requiring the
    Points column in the parser, but a badly placed separator can still bleed a
    stray token onto a term-header line. `MARKED FOR TESTING (B, D)`.
  - over-split a sparse single-column table, or under-split when columns are
    very close. Real pages in the fixture classify correctly, but this is the
    most fragile part. `MARKED FOR TESTING (B)`.
- **One known term-attribution edge case (D).** In the reference PDF,
  `UNIV 301` is physically rendered at `x≈413` (right of its column's other
  rows) because a `Repeated:` annotation shifts the column. It is captured with
  the correct grade/credits but tagged `Fall 2025` instead of `Fall 2024`. This
  is a layout-position ambiguity, not a parser bug. `MARKED FOR TESTING (D)`.
- **Single real sample (H).** All heuristics are validated against one real
  transcript. Thresholds may be overfit to it. `MARKED FOR TESTING (H)`.
- **Points-optional matching (C).** Dropping the Points anchor makes parsing
  tolerant but slightly less strict; a description containing a token shaped like
  `LETTERS ### … 0.000 0.000 X` could in theory create a false row. Not observed,
  but worth fuzzing. `MARKED FOR TESTING (C)`.
- **Retake folding.** A course taken twice (CSC 210: E then C) collapses to one
  entry flagged `isRetake` with `bestGrade`. The excluded original term is no
  longer surfaced as its own row. This matches the current downstream credit
  math but is a product decision to confirm.
- **Verification coupling (G).** Cleaner names change what
  `verifyTranscript` compares. A previously "passing" mismatch could now behave
  differently. `namesMatch` fuzzy logic was reviewed but not changed.

## What needs extensive testing

1. **More real transcripts (highest priority).** Single-column only, heavy
   transfer credit, study-abroad terms, graduate records, withdrawals/incompletes,
   and older UAccess print templates. Add each as a sanitized text fixture.
2. **Column detector robustness (B).** Vary column widths, uneven column heights,
   three-column edge cases, and pages where one column is nearly empty.
3. **Term attribution (D3).** Confirm terms stay correct when annotations
   (`Repeated:`, `Course Attrib:`) shift row alignment between columns.
4. **Non-transcript / scanned inputs (F2).** Exam PDFs (the screenshot case),
   syllabi, advisement reports, and image-only scans should each produce the
   correct tiered message.
5. **Scoring function (A2).** Ensure "more courses" never lets a noisier
   extraction outrank a clean one; consider penalizing `Unknown Term` rows.

## Future development plan

- **E3 — structured parser contract.** Migrate `parseTranscriptText(string)` to
  consume structured `{ text, column, term }` rows (or positioned items) so term
  attribution and dedup can use real geometry instead of linearized text. This
  removes the "column bleed onto a term line" class of bugs entirely. (Chosen to
  defer per design decision **E1 now → E3 later**.)
- **F3 — confidence + preview-before-save.** Show "Found N courses across M
  terms" and let the user confirm before persisting, guarding against
  confidently-wrong parses. (Deferred per **F2 now → F3 later**.)
- **Structural column anchoring.** Use UAccess-specific anchors (paired
  `Course Description AHRS EHRS Grade Points` headers, side-by-side term headers)
  to locate the true inter-column gutter, replacing the pure density valley.
- **Server-side / OCR path.** The upload API currently refuses server parsing
  (`415` on Vercel). A server route (or OCR via Tesseract/cloud) would handle
  scanned or unusual PDFs that the browser pipeline cannot.
- **Golden-file test expansion (H).** Grow `tests/fixtures/` into a labeled
  corpus with expected course/term JSON per transcript, and add property/fuzz
  tests around `detectColumnSplit` and `fullRowPattern`.

## Regenerating the test fixture

The fixture is sanitized text produced by the real extraction path. The source
PDF is never committed.

```bash
npx tsx scripts/genTranscriptFixture.ts <path-to-transcript.pdf> tests/fixtures/uaccess-multicolumn.txt
npm test
```
