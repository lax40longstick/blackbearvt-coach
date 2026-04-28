import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const file = (path) => new URL(path, root);

test('critical app files exist', () => {
  ['app.html','practice.html','marketplace.html','netlify/functions/ai-practice-builder.js','src/features/practice/drill-scoring.js','src/features/sharing/practice-sharing.js'].forEach((path) => assert.equal(existsSync(file(path)), true, path));
});

test('AI function has production guards', () => {
  const src = readFileSync(file('netlify/functions/ai-practice-builder.js'), 'utf8');
  assert.match(src, /OPENAI_API_KEY/);
  assert.match(src, /AI_RATE_LIMIT_PER_MINUTE/);
  assert.match(src, /ai_generation_logs/);
  assert.match(src, /validatePromptSafety/);
});

test('sharing includes public viewer and PDF export', () => {
  const sharing = readFileSync(file('src/features/sharing/practice-sharing.js'), 'utf8');
  assert.match(sharing, /exportPracticeToPdf/);
  assert.match(sharing, /renderPublicPracticePlan/);
  assert.match(readFileSync(file('practice.html'), 'utf8'), /renderPublicPracticePlan/);
});

test('marketplace schema exists', () => {
  const schema = readFileSync(file('supabase/schema.sql'), 'utf8');
  assert.match(schema, /marketplace_plans/);
  assert.match(schema, /marketplace_reviews/);
  assert.match(schema, /ai_generation_logs/);
});
