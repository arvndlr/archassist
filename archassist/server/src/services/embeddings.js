// Pluggable embedding providers for RAG.
//  - local:  deterministic feature-hashing embedding. No API key, works offline.
//            Good enough for a curated knowledge base of a few hundred entries.
//  - voyage: Voyage AI embeddings (Anthropic's recommended embedding partner).
//  - openai: OpenAI embeddings.
import crypto from 'node:crypto';
import { config } from '../config.js';

const LOCAL_DIMS = 512;

const STOPWORDS = new Set(
  ('a an and are as at be by can for from has have in into is it its of on or that the their them this to ' +
   'was were will with within which who whom our we you your they should would could may might must also ' +
   'such than then there these those so if not no but all any each other more most very using use used')
    .split(' '),
);

// Domain synonyms so that student wording maps onto knowledge-base wording.
const SYNONYMS = {
  realtime: ['latency', 'event', 'performance'],
  fast: ['performance', 'latency'],
  speed: ['performance'],
  grow: ['scalability'],
  growth: ['scalability'],
  traffic: ['scalability', 'load'],
  uptime: ['availability'],
  downtime: ['availability'],
  offline: ['availability', 'local'],
  login: ['authentication', 'security'],
  password: ['authentication', 'security'],
  privacy: ['security', 'encryption'],
  payment: ['security', 'transaction'],
  sensor: ['iot', 'device'],
  arduino: ['iot', 'embedded', 'device'],
  esp32: ['iot', 'embedded', 'device'],
  raspberry: ['iot', 'embedded', 'device'],
  chatbot: ['ai', 'llm'],
  machine: ['ai'],
  model: ['ai'],
  notification: ['event', 'messaging'],
  chat: ['messaging', 'event'],
  android: ['mobile'],
  ios: ['mobile'],
  flutter: ['mobile'],
  react: ['web', 'frontend'],
  maintain: ['maintainability'],
  change: ['modifiability', 'maintainability'],
  test: ['testability'],
  deploy: ['deployability'],
  cheap: ['cost'],
  budget: ['cost'],
  simple: ['simplicity'],
  beginner: ['simplicity'],
  plugin: ['microkernel', 'extensibility'],
  integration: ['interoperability', 'api'],
  api: ['interoperability'],
};

function stem(word) {
  // Very small suffix stripper; keeps tokens comparable across inflections.
  return word
    .replace(/(ies)$/, 'y')
    .replace(/(ing|edly|ed|ly|es|s)$/, '')
    .replace(/(ation|ability|ility)$/, '');
}

export function tokenize(text) {
  const raw = String(text ?? '')
    .toLowerCase()
    .replace(/real[-\s]?time/g, 'realtime')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
  const out = [];
  for (const w of raw) {
    out.push(stem(w));
    for (const s of SYNONYMS[w] ?? []) out.push(stem(s));
  }
  return out;
}

function hashIndex(feature) {
  const h = crypto.createHash('md5').update(feature).digest();
  return { index: h.readUInt32LE(0) % LOCAL_DIMS, sign: h[4] & 1 ? 1 : -1 };
}

function localEmbed(text) {
  const tokens = tokenize(text);
  const vec = new Float64Array(LOCAL_DIMS);
  const add = (feature, weight) => {
    const { index, sign } = hashIndex(feature);
    vec[index] += sign * weight;
  };
  const counts = new Map();
  for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);
  for (const [t, c] of counts) add(`u:${t}`, 1 + Math.log(c)); // sublinear tf
  for (let i = 0; i < tokens.length - 1; i++) add(`b:${tokens[i]}_${tokens[i + 1]}`, 0.5);
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  return Array.from(vec, (v) => v / norm);
}

async function voyageEmbed(texts, inputType) {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.embeddings.voyageApiKey}` },
    body: JSON.stringify({ input: texts, model: config.embeddings.voyageModel, input_type: inputType }),
  });
  if (!res.ok) throw new Error(`Voyage embeddings failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.data.map((d) => d.embedding);
}

async function openaiEmbed(texts) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.embeddings.openaiApiKey}` },
    body: JSON.stringify({ input: texts, model: config.embeddings.openaiModel }),
  });
  if (!res.ok) throw new Error(`OpenAI embeddings failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.data.map((d) => d.embedding);
}

/** Identifier stored with every chunk so vectors from different models never mix. */
export function embeddingModelId() {
  switch (config.embeddings.provider) {
    case 'voyage': return `voyage:${config.embeddings.voyageModel}`;
    case 'openai': return `openai:${config.embeddings.openaiModel}`;
    default:       return `local:hash-${LOCAL_DIMS}-v1`;
  }
}

/**
 * Embed a batch of texts.
 * @param {string[]} texts
 * @param {'document'|'query'} inputType
 */
export async function embed(texts, inputType = 'document') {
  if (texts.length === 0) return [];
  switch (config.embeddings.provider) {
    case 'voyage': return voyageEmbed(texts, inputType);
    case 'openai': return openaiEmbed(texts);
    default:       return texts.map(localEmbed);
  }
}
