import { test } from 'node:test';
import assert from 'node:assert/strict';

import { detectColumnSplit, layoutItemsToText, PositionedItem } from '../app/lib/browserPdfText';

// Build a synthetic two-column page: two dense text columns separated by a gutter.
function twoColumnItems(): PositionedItem[] {
    const items: PositionedItem[] = [];
    for (let row = 0; row < 12; row++) {
        const y = 700 - row * 20;
        // Left column tokens (x 50–250).
        for (let k = 0; k < 5; k++) items.push({ text: `L${row}-${k}`, x: 50 + k * 40, y, width: 30 });
        // Right column tokens (x 450–650), leaving a clear gutter ~250–450.
        for (let k = 0; k < 5; k++) items.push({ text: `R${row}-${k}`, x: 450 + k * 40, y, width: 30 });
    }
    return items;
}

// A realistic single column: words flow continuously across each row with no
// wide interior whitespace band (unlike a perfectly aligned grid).
function singleColumnItems(): PositionedItem[] {
    const items: PositionedItem[] = [];
    for (let row = 0; row < 12; row++) {
        const y = 700 - row * 20;
        for (let k = 0; k < 10; k++) items.push({ text: `word${row}_${k}`, x: 50 + k * 55, y, width: 50 });
    }
    return items;
}

test('detects a two-column layout and splits within the gutter', () => {
    const split = detectColumnSplit(twoColumnItems());
    assert.equal(split.isMultiColumn, true);
    // The gutter lies between the left column (ends ~240) and right column (starts 450).
    assert.ok(split.separatorX! > 235 && split.separatorX! < 455, `separator ${split.separatorX} should sit in the gutter`);
});

test('treats a single wide column as single-column', () => {
    const split = detectColumnSplit(singleColumnItems());
    assert.equal(split.isMultiColumn, false);
});

test('ignores pages with too few items', () => {
    const split = detectColumnSplit([
        { text: 'A', x: 50, y: 700, width: 10 },
        { text: 'B', x: 500, y: 700, width: 10 },
    ]);
    assert.equal(split.isMultiColumn, false);
});

test('linearizes columns left-then-right so each column reads in order', () => {
    const text = layoutItemsToText(twoColumnItems());
    const lines = text.split('\n');
    // Every left-column line should appear before every right-column line.
    const lastLeft = lines.map((l, i) => (l.startsWith('L') ? i : -1)).reduce((a, b) => Math.max(a, b), -1);
    const firstRight = lines.findIndex(l => l.startsWith('R'));
    assert.ok(lastLeft < firstRight, 'left column should be emitted before right column');
});
