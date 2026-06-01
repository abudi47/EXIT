/** Resolve MongoDB connection string (Atlas via MONGO_URI in server/.env). */
export function getMongoUri() {
  const uri = process.env.MONGO_URI?.trim();
  if (!uri) {
    throw new Error(
      "MONGO_URI is required (Atlas connection string in server/.env or Vercel env vars)"
    );
  }
  return uri;
}

export function redactMongoUri(uri) {
  try {
    const u = new URL(uri.replace(/^mongodb(\+srv)?:/, "https:"));
    if (u.password) u.password = "***";
    return u.href.replace(/^https:/, uri.startsWith("mongodb+srv") ? "mongodb+srv:" : "mongodb:");
  } catch {
    return "(invalid URI)";
  }
}
