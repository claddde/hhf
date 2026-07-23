/* validate.js — request validation + sanitization helpers. */
export function isAddress(a) { return typeof a === 'string' && /^0x[a-fA-F0-9]{40}$/.test(a); }

export function requireFields(fields) {
  return (req, res, next) => {
    for (const f of fields) if (req.body[f] === undefined || req.body[f] === null)
      return res.status(400).json({ error: 'MISSING_FIELD', field: f });
    next();
  };
}

/** Clamp an integer into a safe range. */
export function intIn(v, min, max, dflt = min) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return dflt;
  return Math.max(min, Math.min(max, n));
}

/** Shallow-sanitize a JSON blob: strip functions, cap size. */
export function safeJson(obj, maxBytes = 64 * 1024) {
  const str = JSON.stringify(obj ?? {});
  if (str.length > maxBytes) throw new Error('PAYLOAD_TOO_LARGE');
  return JSON.parse(str);
}
