// Reusable SQL fragments.

/**
 * Decision-matrix score (0–100) of the architecture a report recommended.
 * Falls back to the top candidate when the LLM named a style not in the matrix.
 * @param {string} r alias of the recommendations table
 */
export const fitScore = (r) => `COALESCE(
  (SELECT (c->>'score')::numeric FROM jsonb_array_elements(${r}.decision_matrix->'candidates') c
    WHERE c->>'entry_id' = ${r}.report->'recommended_architecture'->>'entry_id' LIMIT 1),
  (${r}.decision_matrix->'candidates'->0->>'score')::numeric)`;

/** Number of times a knowledge entry appeared in retrieval context since `since`. */
export const retrievalCount = (entryIdExpr, since = "now() - interval '30 days'") => `(
  SELECT count(*)::int FROM recommendations rr, jsonb_array_elements(rr.retrieved->'entries') re
  WHERE (re->>'id')::int = ${entryIdExpr} AND rr.created_at >= ${since})`;
