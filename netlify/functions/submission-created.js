// netlify/functions/submission-created.js
export async function handler(event) {
  try {
    const { payload = {} } = JSON.parse(event.body || "{}");
    const data = payload.data || {};
    const formName = payload.form_name || "";

    // Only handle your "apply" form
    if (formName !== "apply") {
      return { statusCode: 200, body: "Ignored (not the apply form)" };
    }

    const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME } = process.env;

    const fields = {
      "Email": data.email || "",
      "City & Time Zone": data.city || "",
      "Gender": (data.gender || "").toString(),
      // If Seeking is multi-select in the future, Airtable accepts an array.
      // If it's text (today), it accepts a string. We'll send an array first, then retry as string if needed.
      "Seeking": Array.isArray(data.seeking)
        ? data.seeking.map(String)
        : (data.seeking ? [String(data.seeking)] : []),
      "Submission Date": new Date().toISOString()
    };

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`;
    const headers = {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      "Content-Type": "application/json",
    };

    // Try insert (works if Seeking is multi-select)
    let res = await fetch(url, { method: "POST", headers, body: JSON.stringify({ fields }) });

    if (!res.ok) {
      // Retry with Seeking as a plain string (works if Seeking is text)
      const text = await res.text();
      const retryFields = {
        ...fields,
        "Seeking": Array.isArray(fields["Seeking"]) ? fields["Seeking"].join(", ") : (fields["Seeking"] || ""),
      };
      const res2 = await fetch(url, { method: "POST", headers, body: JSON.stringify({ fields: retryFields }) });

      if (!res2.ok) {
        console.error("Airtable error:", res.status, text, "Retry:", await res2.text());
        return { statusCode: res2.status, body: "Airtable insert failed" };
      }

      return { statusCode: 200, body: "Inserted (retry as text)" };
    }

    return { statusCode: 200, body: "Inserted" };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "Function error" };
  }
}


