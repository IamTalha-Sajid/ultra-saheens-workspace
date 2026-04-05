import mongoose from "mongoose";

const DEFAULT_DB = "ultra-shaheens";

/**
 * If Atlas gives you `...mongodb.net/` with no database name, append the default DB
 * and `retryWrites` / `w` when missing (matches Atlas "Connect" string).
 */
function finalizeMongoUri(uri: string): string {
  const db = process.env.MONGODB_DB?.trim() || DEFAULT_DB;
  const u = uri.trim();
  const qIdx = u.indexOf("?");
  const base = qIdx >= 0 ? u.slice(0, qIdx) : u;
  const query = qIdx >= 0 ? u.slice(qIdx + 1) : "";

  const at = base.lastIndexOf("@");
  if (at < 0) return u;

  const rest = base.slice(at + 1);
  const slash = rest.indexOf("/");
  const pathAfterSlash = slash >= 0 ? rest.slice(slash + 1) : "";

  let newBase = base;
  if (slash < 0) {
    newBase = `${base}/${db}`;
  } else if (pathAfterSlash === "") {
    newBase = `${base}${db}`;
  }

  const needsDefaultQuery = !query && !u.includes("retryWrites");
  const qFinal = needsDefaultQuery ? "retryWrites=true&w=majority" : query;

  if (qFinal) {
    return `${newBase}?${qFinal}`;
  }
  return newBase;
}

/**
 * Uses MONGODB_URI when set (Atlas "Connect" string). Otherwise builds from
 * MONGODB_USER + MONGODB_PASSWORD + MONGODB_CLUSTER_HOST (password URL-encoded).
 */
function getMongoUri(): string {
  const explicit = process.env.MONGODB_URI?.trim();
  if (explicit) {
    return finalizeMongoUri(explicit);
  }

  const user = process.env.MONGODB_USER?.trim();
  const password = process.env.MONGODB_PASSWORD ?? "";
  const host =
    process.env.MONGODB_CLUSTER_HOST?.trim() ||
    process.env.MONGODB_HOST?.trim();
  const db = process.env.MONGODB_DB?.trim() || DEFAULT_DB;

  if (user && password.length > 0 && host) {
    return `mongodb+srv://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}/${db}?retryWrites=true&w=majority`;
  }

  throw new Error(
    "Set MONGODB_URI (see .env.example), or MONGODB_USER + MONGODB_PASSWORD + MONGODB_CLUSTER_HOST"
  );
}

const globalForMongoose = globalThis as typeof globalThis & {
  mongooseConn?: typeof mongoose;
  mongoosePromise?: Promise<typeof mongoose>;
  mongoConnectedLogged?: boolean;
};

export async function connectDB(): Promise<typeof mongoose> {
  const uri = getMongoUri();

  if (globalForMongoose.mongooseConn) {
    return globalForMongoose.mongooseConn;
  }
  if (!globalForMongoose.mongoosePromise) {
    globalForMongoose.mongoosePromise = mongoose.connect(uri);
  }
  globalForMongoose.mongooseConn = await globalForMongoose.mongoosePromise;
  if (!globalForMongoose.mongoConnectedLogged) {
    globalForMongoose.mongoConnectedLogged = true;
    const { name, host } = globalForMongoose.mongooseConn.connection;
    const where = host ? ` @ ${host}` : "";
    console.log(`[mongodb] Connected successfully — database "${name}"${where}`);
  }
  return globalForMongoose.mongooseConn;
}
