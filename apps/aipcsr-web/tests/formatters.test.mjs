import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

process.env.TZ = 'Asia/Kolkata';
const source = readFileSync(new URL('../lib/formatters.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2020 } });
const { parseApiDate, formatDuration, formatRelative } = await import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'));

test('UTC timestamps without a zone are not interpreted as local time', () => {
  assert.equal(parseApiDate('2026-10-28T10:00:00').getTime(), Date.UTC(2026, 9, 28, 10, 0, 0));
  assert.equal(parseApiDate('2026-10-28T15:30:00+05:30').getTime(), Date.UTC(2026, 9, 28, 10, 0, 0));
});

test('durations remain correct across legacy and zoned API timestamps', () => {
  assert.equal(formatDuration('2026-10-28T10:00:00', '2026-10-28T10:01:30Z'), '1m 30s');
});

test('a new UTC scan is shown as just now in a non-UTC browser', () => {
  assert.equal(formatRelative(new Date().toISOString().replace(/Z$/, '')), 'just now');
});
