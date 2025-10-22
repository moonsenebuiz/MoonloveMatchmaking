// netlify/functions/submission-created.js

export async function handler(event) {
  try {
    const { payload } = JSON.parse(event.body || "{}");
    const data = payload?.data || {};         // Netlify Form fields
    const formName = payload?.form_name || "";

    // Only handle your Apply form
    if (formName !== "apply") {
      return { statusCode: 200, body: "Ignored (not the apply form)" };
    }

    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const TABLE_NAME       = process.env.AIRTABLE_TABLE_NAME; // << no literal!

    // Map your form fields to Airtable columns
    const fields = {
      "Email": data.email || "",
      "City & Time Zone": data.city || "",
      "Gender": data.gender || "",
      "Seeking": Array.isArray(data.seeking) ? data.seeking : (data.seeking ? [data.seeking] : []),
      "Submission Date": new Date().toISOString()
    };

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_NAME)}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields })
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Airtable error:", res.status, text);
      return { statusCode: 500, body: "Failed to create Airtable record" };
    }

    return { statusCode: 200, body: "Airtable record created" };
  } catch (err) {
    console.error("Function error:", err);
    return { statusCode: 500, body: "Function error" };
  }
}

