import { appendRows } from "../lib/sheets.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { effort, sessionId } = req.body || {};
    if (!effort) return res.status(400).json({ ok: false, error: "Missing effort" });

    const sid = sessionId || new Date().toISOString().split("T")[0];

    const row = [[sid, effort]];

    const resp = await appendRows({
      sheetName: "Effort",
      rows: row
    });

    if (!resp.ok) return res.status(500).json({ ok: false, error: resp.error });

    return res.status(200).json({ ok: true, row });
  } catch (err) {
    console.error("❌ logEffort error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

