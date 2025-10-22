export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { form_name, data, created_at } = body.payload || {};

    // Only handle your Moonlove application form
    if (form_name !== "apply") {
      return { statusCode: 200, body: "Ignored (not the apply form)" };
    }

    // Normalize 'seeking' field
    const seekingRaw = data["seeking"] ?? data["seeking[]"];
    const seeking = Array.isArray(seekingRaw)
      ? seekingRaw
      : seekingRaw
      ? [seekingRaw]
      : [];

    const fields = {
      Email: data.email || "",
      "City & Time Zone": data.city || "",
      Gender: data.gender ? [data.gender] : [],
      Seeking: seeking,
      Bio: data.bio || "",
      "Submission Date": created_at || new Date().toISOString(),
      Status: "New",
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
