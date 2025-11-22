import { google } from "googleapis";

// Cached client across invocations
let sheetsClient = null;

function getSheetsClient() {
  if (sheetsClient) return sheetsClient;

  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!process.env.GOOGLE_CLIENT_EMAIL || !privateKey) {
    throw new Error("Missing GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY.");
  }

  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    privateKey,
    ["https://www.googleapis.com/auth/spreadsheets"]
  );

  sheetsClient = google.sheets({ version: "v4", auth });
  return sheetsClient;
}

export async function appendToSheet({ sheetName, range, values }) {
  try {
    const sheets = getSheetsClient();

    const resp = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: `${sheetName}!${range}`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values }
    });

    return { ok: true, updates: resp.data.updates };
  } catch (err) {
    console.error("❌ Google Sheets append error:", err);
    return { ok: false, error: err.message };
  }
}

export async function appendRows({ sheetName, startColumn = "A", rows }) {
  if (!rows?.length) {
    return { ok: false, error: "appendRows called with empty rows." };
  }

  return appendToSheet({
    sheetName,
    range: `${startColumn}:${startColumn}`,
    values: rows
  });
}

