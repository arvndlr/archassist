import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeProject } from '../src/services/analyzer.js';
import { embed, tokenize } from '../src/services/embeddings.js';
import { chunkEntry } from '../src/services/knowledge.js';
import { SEED_ENTRIES } from '../src/data/knowledge-seed.js';
import { QA_KEYS } from '../src/lib/domain.js';

const project = {
  title: 'Campus Canteen Ordering App',
  description: 'Mobile app where students pre-order food and pay with GCash; staff get real-time order notifications.',
  project_type: 'mobile', functional_requirements: ['Browse menu', 'Place order', 'Pay online'],
  expected_users: 'large', team_size: 3, team_experience: 'beginner', timeline_weeks: 10, deployment: 'cloud',
  quality_attributes: [{ attribute: 'security', priority: 5 }, { attribute: 'performance', priority: 3 }],
};

test('analyzer builds a profile with signals and derived weights', () => {
  const p = analyzeProject(project);
  assert.equal(p.ranked_quality_attributes[0].key, 'security');
  assert.ok(p.signals.includes('Handles payments or transactions'));
  assert.ok(p.signals.includes('Real-time updates'));
  assert.ok(p.weights.scalability >= 3, 'large user base raises scalability weight');
  assert.ok(p.weights.simplicity >= 3, 'beginner team raises simplicity weight');
  assert.equal(p.quality_attributes.scalability, 0, 'student input is not overwritten');
  assert.match(p.retrieval_query, /Security/);
});

test('local embeddings are normalized and similar texts score higher', async () => {
  const [a, b, c] = await embed(['real-time IoT sensor monitoring', 'live sensor data from ESP32 devices', 'payroll accounting report']);
  const dot = (x, y) => x.reduce((s, v, i) => s + v * y[i], 0);
  assert.ok(Math.abs(dot(a, a) - 1) < 1e-9);
  assert.ok(dot(a, b) > dot(a, c));
  assert.ok(tokenize('ESP32').includes('iot'));
});

test('seed knowledge is well-formed', () => {
  const styles = SEED_ENTRIES.filter((e) => e.category === 'style');
  assert.ok(styles.length >= 10);
  for (const s of styles) {
    for (const k of QA_KEYS) assert.ok(s.attributes.qa[k] >= 1 && s.attributes.qa[k] <= 5, `${s.title} ${k}`);
    assert.ok(s.attributes.structure.length > 0, `${s.title} has structure`);
  }
  const chunks = chunkEntry({ ...styles[0], id: 1 });
  assert.ok(chunks.length >= 2);
  assert.ok(chunks.every((c) => c.startsWith(styles[0].title)));
});

test('normalizeReport fills missing fields and drops unknown references', async () => {
  const { normalizeReport } = await import('../src/services/llm.js');
  const retrieved = { entries: [{ id: 7, title: 'Layered' }, { id: 9, title: 'Caching' }] };
  const r = normalizeReport({ recommended_architecture: { name: 'Layered', entry_id: 99 }, confidence: 'sure', references: [{ entry_id: 42, title: 'x' }] }, retrieved);
  assert.equal(r.recommended_architecture.entry_id, null);
  assert.equal(r.confidence, 'medium');
  assert.deepEqual(r.alternatives, []);
  assert.deepEqual(r.references.map((x) => x.entry_id), [7, 9]);
});
