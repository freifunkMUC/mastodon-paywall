// Persists the mapping between a PayPal subscription and the Mastodon
// account it paid for, so a cancellation/expiry webhook later knows which
// account to disable. Backend is chosen via DATABASE_URL:
//   sqlite:./path/to/file.sqlite3   (default, no extra service required)
//   postgres://user:pass@host/db
//   mysql://user:pass@host/db
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const DATABASE_URL = process.env.DATABASE_URL || "sqlite:./data/paywall.sqlite3";

const mapRow = (row) => ({
  subscriptionId: row.subscription_id,
  mastodonAccountId: row.mastodon_account_id,
  username: row.username,
  status: row.status,
  createdAt: Number(row.created_at),
  updatedAt: Number(row.updated_at),
});

const createSqliteBackend = async (url) => {
  const { DatabaseSync } = await import("node:sqlite");
  const filename = url.slice("sqlite:".length) || "./data/paywall.sqlite3";

  if (filename !== ":memory:") {
    mkdirSync(dirname(filename), { recursive: true });
  }

  const db = new DatabaseSync(filename);
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      subscription_id TEXT PRIMARY KEY,
      mastodon_account_id TEXT NOT NULL,
      username TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  return {
    async recordSubscription({ subscriptionId, mastodonAccountId, username }) {
      const now = Date.now();
      db.prepare(
        `INSERT INTO subscriptions (subscription_id, mastodon_account_id, username, status, created_at, updated_at)
         VALUES (?, ?, ?, 'active', ?, ?)
         ON CONFLICT(subscription_id) DO UPDATE SET
           mastodon_account_id = excluded.mastodon_account_id,
           username = excluded.username,
           updated_at = excluded.updated_at`,
      ).run(subscriptionId, mastodonAccountId, username ?? null, now, now);
    },
    async findBySubscriptionId(subscriptionId) {
      const row = db
        .prepare(`SELECT * FROM subscriptions WHERE subscription_id = ?`)
        .get(subscriptionId);
      return row ? mapRow(row) : null;
    },
    async setStatus(subscriptionId, status) {
      db.prepare(
        `UPDATE subscriptions SET status = ?, updated_at = ? WHERE subscription_id = ?`,
      ).run(status, Date.now(), subscriptionId);
    },
  };
};

const createPostgresBackend = async (url) => {
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: url });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      subscription_id VARCHAR(64) PRIMARY KEY,
      mastodon_account_id VARCHAR(64) NOT NULL,
      username VARCHAR(64),
      status VARCHAR(16) NOT NULL DEFAULT 'active',
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    )
  `);

  return {
    async recordSubscription({ subscriptionId, mastodonAccountId, username }) {
      const now = Date.now();
      await pool.query(
        `INSERT INTO subscriptions (subscription_id, mastodon_account_id, username, status, created_at, updated_at)
         VALUES ($1, $2, $3, 'active', $4, $4)
         ON CONFLICT (subscription_id) DO UPDATE SET
           mastodon_account_id = EXCLUDED.mastodon_account_id,
           username = EXCLUDED.username,
           updated_at = EXCLUDED.updated_at`,
        [subscriptionId, mastodonAccountId, username ?? null, now],
      );
    },
    async findBySubscriptionId(subscriptionId) {
      const { rows } = await pool.query(
        `SELECT * FROM subscriptions WHERE subscription_id = $1`,
        [subscriptionId],
      );
      return rows[0] ? mapRow(rows[0]) : null;
    },
    async setStatus(subscriptionId, status) {
      await pool.query(
        `UPDATE subscriptions SET status = $1, updated_at = $2 WHERE subscription_id = $3`,
        [status, Date.now(), subscriptionId],
      );
    },
  };
};

const createMysqlBackend = async (url) => {
  const mysql = await import("mysql2/promise");
  const pool = mysql.createPool(url);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      subscription_id VARCHAR(64) PRIMARY KEY,
      mastodon_account_id VARCHAR(64) NOT NULL,
      username VARCHAR(64),
      status VARCHAR(16) NOT NULL DEFAULT 'active',
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    )
  `);

  return {
    async recordSubscription({ subscriptionId, mastodonAccountId, username }) {
      const now = Date.now();
      await pool.query(
        `INSERT INTO subscriptions (subscription_id, mastodon_account_id, username, status, created_at, updated_at)
         VALUES (?, ?, ?, 'active', ?, ?)
         ON DUPLICATE KEY UPDATE
           mastodon_account_id = VALUES(mastodon_account_id),
           username = VALUES(username),
           updated_at = VALUES(updated_at)`,
        [subscriptionId, mastodonAccountId, username ?? null, now, now],
      );
    },
    async findBySubscriptionId(subscriptionId) {
      const [rows] = await pool.query(
        `SELECT * FROM subscriptions WHERE subscription_id = ?`,
        [subscriptionId],
      );
      return rows[0] ? mapRow(rows[0]) : null;
    },
    async setStatus(subscriptionId, status) {
      await pool.query(
        `UPDATE subscriptions SET status = ?, updated_at = ? WHERE subscription_id = ?`,
        [status, Date.now(), subscriptionId],
      );
    },
  };
};

let backendPromise;

const getBackend = () => {
  if (!backendPromise) {
    if (DATABASE_URL.startsWith("sqlite:")) {
      backendPromise = createSqliteBackend(DATABASE_URL);
    } else if (
      DATABASE_URL.startsWith("postgres://") ||
      DATABASE_URL.startsWith("postgresql://")
    ) {
      backendPromise = createPostgresBackend(DATABASE_URL);
    } else if (DATABASE_URL.startsWith("mysql://")) {
      backendPromise = createMysqlBackend(DATABASE_URL);
    } else {
      throw new Error(`Unsupported DATABASE_URL scheme: ${DATABASE_URL}`);
    }
  }
  return backendPromise;
};

export const recordSubscription = async (data) =>
  (await getBackend()).recordSubscription(data);

export const findBySubscriptionId = async (subscriptionId) =>
  (await getBackend()).findBySubscriptionId(subscriptionId);

export const setSubscriptionStatus = async (subscriptionId, status) =>
  (await getBackend()).setStatus(subscriptionId, status);
