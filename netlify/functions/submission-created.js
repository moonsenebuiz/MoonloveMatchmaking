// netlify/functions/submission-created.js
// Runs automatically when a Netlify Form is created (name must be submission-created.js)
// Docs: https://docs.netlify.com/forms/notifications/#serverless-function

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

// 👉 Change this if your Airtable table has a different name
const AIRTABLE_TABLE_NAME = "Submissions"; // e.g. "Submissions" or whatever you used

// Map HTML form field names -> Airtable column names
const FIELD_MAP = {
  email: "Email",
  city: "City & Time Zone",
  gender: "Gender",
  seeking: "Seeking",     // multi-select in Airtable is fine; we’ll coerce to array
  bio: "Bio",
};

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const payload = body.payload || {};
    const formName = payload.form_name;

    // Only handle the "apply" form
    if (formName !== "apply") {
      return { statusCode: 200, body: "Ignored (not the apply form)" };
    }

    // Netlify sends fields either under "data" or "fields" depending on context
    const data = payload.data || payload.fields || {};
    const submittedAt = payload.created_at || new Date().toISOString();

    // Build Airtable fields object using our map
    const airtableFields = {};
    for (const [formField, airtableColumn] of Object.entries(FIELD_MAP)) {
      if (data[formField] != null && data[formField] !== "") {
        // Seeking might come through as comma string; coerce to array if needed
        if (formField === "seeking") {
          const value = data[formField];
          airtableFields[airtableColumn] = Array.isArray(value)
            ? value
            : String(value)
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
        } else {
          airtableFields[airtableColumn] = data[formField];
        }
      }
    }

    // Add a couple of helpful columns if you have them
    airtableFields["Status"] = airtableFields["Status"] || "New";
    airtableFields["SubmittedAt"] = submittedAt;

    // Send to Airtable
    const url = `https://api.airtable.com/v0/${encodeURIComponent(
      AIRTABLE_BASE_ID
    )}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ records: [{ fields: airtableFields }] }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Airtable error:", text);
      return { statusCode: 500, body: `Airtable error: ${text}` };
    }

    return { statusCode: 200, body: "Submitted to Airtable ✅" };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: `Function error: ${err.message}` };
  }
};


    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableName = process.env.AIRTABLE_TABLE_NAME || "Submissions";
    const apiKey = process.env.AIRTABLE_API_KEY;

    if (!baseId || !apiKey) {
      console.error("Missing Airtable env vars.");
      return { statusCode: 500, body: "Airtable is not configured" };
    }

    const res = await fetch(
      `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ records: [{ fields }] }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("Airtable error:", res.status, text);
      return { statusCode: 500, body: "Failed to write to Airtable" };
    }

    return { statusCode: 200, body: "Saved to Airtable" };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "Function error" };
  }
};
