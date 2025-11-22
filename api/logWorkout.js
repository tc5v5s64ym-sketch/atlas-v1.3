import { appendRows } from "../lib/sheets.js";

// ----------------------
// Canonical exercise map
// ----------------------
const EXERCISE_MAP = [
  { canon: "Bench press", keys: ["bench", "bp", "flat bench"] },
  { canon: "Overhead press", keys: ["ohp", "shoulder", "military", "overhead"] },
  { canon: "Back squat", keys: ["squat", "bsq"] },
  { canon: "Deadlift", keys: ["deadlift", "dl"] },
  { canon: "Lat pulldown", keys: ["lat", "pulldown", "lats"] },
  { canon: "Barbell row", keys: ["row", "bor", "barbell row"] },
  { canon: "Dips", keys: ["dip"] }
];

function canonicalizeExercise(raw) {
  const clean = raw.toLowerCase().trim();
  for (const e of EXERCISE_MAP) {
    if (e.keys.some(k => clean.includes(k))) return e.canon;
  }
  return raw.replace(/\b\w/g, c => c.toUpperCase());
}

function generateLiftCode(canon) {
  return canon.replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase() + "01";
}

function parseSetPattern(segment) {
  const weightMatch = segment.match(/(\d+)\s*(lb|lbs)?/i);
  if (!weightMatch) return null;

  const weight = Number(weightMatch[1]);
  const rest = segment.replace(weightMatch[0], "").trim();

  const mult = rest.match(/(\d+)\s*\/\s*(\d+)\s*x\s*(\d+)/i);
  if (mult) {
    const reps = Number(mult[1]);
    const rir = Number(mult[2]);
    const sets = Number(mult[3]);
    return Array.from({ length: sets }, () => ({ weight, reps, rir }));
  }

  const list = rest.match(/\d+\s*\/\s*\d+/g);
  if (list) {
    return list.map(s => {
      const [r, rr] = s.split("/");
      return { weight, reps: Number(r), rir: Number(rr) };
    });
  }

  return null;
}

function e1RM(weight, reps) {
  return weight * (1 + reps / 30);
}

function buildRows(sessionId, sessionNumber, exercise, liftCode, sets) {
  return sets.map((set, i) => [
    sessionId,            // Date
    sessionId,            // Session ID
    exercise,
    liftCode,
    i + 1,
    set.weight,
    set.reps,
    set.rir,
    "",
    set.weight * set.reps,
    Number(e1RM(set.weight, set.reps).toFixed(2)),
    sessionNumber,
    "OK"
  ]);
}

function parseWorkout(text, sessionId, sessionNumber) {
  const chunks = text.split(";").map(c => c.trim()).filter(Boolean);
  let rows = [];

  for (const chunk of chunks) {
    const exMatch = chunk.match(/^(.+?)\s+\d/);
    if (!exMatch) continue;

    const raw = exMatch[1].trim();
    const canon = canonicalizeExercise(raw);
    const liftCode = generateLiftCode(canon);

    const pattern = chunk.replace(raw, "").trim();
    const sets = parseSetPattern(pattern);
    if (!sets) continue;

    rows.push(...buildRows(sessionId, sessionNumber, canon, liftCode, sets));
  }

  return rows;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { command, sessionNumber, sessionId: override } = req.body || {};
    if (!command) return res.status(400).json({ ok: false, error: "Missing command" });
    if (!sessionNumber) return res.status(400).json({ ok: false, error: "Missing sessionNumber" });

    const sessionId =
      override || new Date().toISOString().split("T")[0];

    const rows = parseWorkout(command, sessionId, sessionNumber);

    if (!rows.length) {
      return res.status(400).json({ ok: false, error: "No sets parsed" });
    }

    const resp = await appendRows({ sheetName: "Log", rows });

    if (!resp.ok) {
      return res.status(500).json({ ok: false, error: resp.error });
    }

    return res.status(200).json({
      ok: true,
      sessionId,
      loggedSets: rows.length,
      rows
    });
  } catch (err) {
    console.error("❌ logWorkout error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

