export async function invokeAdminFunction(
  functionName: string,
  payload: Record<string, any> = {}
) {
  try {
    // Use App Router API route format (matches existing structure)
    const endpoint = `/api/admin/${functionName}`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    const json = text ? JSON.parse(text) : {};

    if (!res.ok) {
      return {
        data: null,
        error: {
          message: json.error || json.message || "Admin API error",
          stage: json.stage,
          details: json.details,
          status: res.status,
        },
      };
    }

    return { data: json, error: null };
  } catch (err: any) {
    return {
      data: null,
      error: {
        message: err.message,
      },
    };
  }
}
