import session from "express-session";
import Redis from "ioredis";
import crypto from "node:crypto";

type SessionValue = session.SessionData;
type SessionCallback = (err?: unknown, session?: SessionValue | null) => void;
type BasicCallback = (err?: unknown) => void;

const DEFAULT_TTL_SECONDS = 24 * 60 * 60;
const SESSION_PREFIX = "sess:";
const RUNTIME_DEV_SESSION_SECRET = crypto.randomBytes(64).toString("hex");

function resolveSessionSecret(): string {
  const configuredSecret = process.env.SESSION_SECRET?.trim();
  if (configuredSecret) {
    return configuredSecret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("[Session] SESSION_SECRET must be set in production");
  }

  console.warn(
    "[Session] SESSION_SECRET is not set; using runtime-generated development fallback secret",
  );
  return RUNTIME_DEV_SESSION_SECRET;
}

class InMemorySessionStore extends session.Store {
  private readonly sessions = new Map<string, { value: string; expiresAt: number }>();
  private readonly cleanupTimer: NodeJS.Timeout;

  constructor() {
    super();
    this.cleanupTimer = setInterval(() => this.cleanupExpired(), 60_000);
  }

  get(sid: string, callback: SessionCallback): void {
    try {
      const entry = this.sessions.get(sid);
      if (!entry) {
        callback(null, null);
        return;
      }

      if (Date.now() >= entry.expiresAt) {
        this.sessions.delete(sid);
        callback(null, null);
        return;
      }

      callback(null, JSON.parse(entry.value));
    } catch (error) {
      callback(error);
    }
  }

  set(sid: string, sess: SessionValue, callback?: BasicCallback): void {
    try {
      const ttlSeconds = getSessionTtlSeconds(sess);
      this.sessions.set(sid, {
        value: JSON.stringify(sess),
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
      callback?.();
    } catch (error) {
      callback?.(error);
    }
  }

  destroy(sid: string, callback?: BasicCallback): void {
    this.sessions.delete(sid);
    callback?.();
  }

  touch(sid: string, sess: SessionValue, callback?: BasicCallback): void {
    const entry = this.sessions.get(sid);
    if (!entry) {
      callback?.();
      return;
    }
    const ttlSeconds = getSessionTtlSeconds(sess);
    this.sessions.set(sid, {
      value: entry.value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    callback?.();
  }

  shutdown(): void {
    clearInterval(this.cleanupTimer);
    this.sessions.clear();
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [sid, entry] of this.sessions.entries()) {
      if (now >= entry.expiresAt) {
        this.sessions.delete(sid);
      }
    }
  }
}

class RedisSessionStore extends session.Store {
  constructor(private readonly redis: Redis, private readonly prefix: string) {
    super();
  }

  get(sid: string, callback: SessionCallback): void {
    this.redis
      .get(this.key(sid))
      .then((data) => {
        if (!data) {
          callback(null, null);
          return;
        }
        callback(null, JSON.parse(data));
      })
      .catch((error) => callback(error));
  }

  set(sid: string, sess: SessionValue, callback?: BasicCallback): void {
    const ttlSeconds = getSessionTtlSeconds(sess);
    this.redis
      .set(this.key(sid), JSON.stringify(sess), "EX", ttlSeconds)
      .then(() => callback?.())
      .catch((error) => callback?.(error));
  }

  destroy(sid: string, callback?: BasicCallback): void {
    this.redis
      .del(this.key(sid))
      .then(() => callback?.())
      .catch((error) => callback?.(error));
  }

  touch(sid: string, sess: SessionValue, callback?: BasicCallback): void {
    const ttlSeconds = getSessionTtlSeconds(sess);
    this.redis
      .expire(this.key(sid), ttlSeconds)
      .then(() => callback?.())
      .catch((error) => callback?.(error));
  }

  private key(sid: string): string {
    return `${this.prefix}${sid}`;
  }
}

function getSessionTtlSeconds(sess: SessionValue): number {
  const cookie = (sess?.cookie ?? {}) as {
    expires?: string | Date;
    maxAge?: number;
  };

  if (cookie.expires) {
    const expiresAt = new Date(cookie.expires).getTime();
    const seconds = Math.ceil((expiresAt - Date.now()) / 1000);
    if (seconds > 0) return seconds;
  }

  if (typeof cookie.maxAge === "number" && cookie.maxAge > 0) {
    return Math.ceil(cookie.maxAge / 1000);
  }

  return DEFAULT_TTL_SECONDS;
}

let inMemoryStore: InMemorySessionStore | null = null;
let redisClient: Redis | null = null;

function getStoreForCurrentEnv() {
  const redisUrl = process.env.REDIS_URL?.trim();

  if (redisUrl) {
    if (!redisClient) {
      redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });
      redisClient.on("error", (err) => {
        console.error("[Session] Redis error:", err.message);
      });
      console.log("[Session] Using Redis-backed session store");
    }
    return new RedisSessionStore(redisClient, SESSION_PREFIX);
  }

  if (!inMemoryStore) {
    inMemoryStore = new InMemorySessionStore();
  }
  console.warn("[Session] REDIS_URL not set; using in-memory session store");
  return inMemoryStore;
}

export function createSessionOptions(isProduction: boolean): session.SessionOptions {
  return {
    store: getStoreForCurrentEnv(),
    secret: resolveSessionSecret(),
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      sameSite: "lax",
      maxAge: DEFAULT_TTL_SECONDS * 1000,
    },
  };
}

export async function closeSessionStore(): Promise<void> {
  if (inMemoryStore) {
    inMemoryStore.shutdown();
    inMemoryStore = null;
  }
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
