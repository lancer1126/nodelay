import Database from "@tauri-apps/plugin-sql";
import { appDataDir, join, normalize } from "@tauri-apps/api/path";
import { copyFile, mkdir, readDir } from "@tauri-apps/plugin-fs";
import type { Entry, Tag, Topic, EntryWithTags } from "../types";

let db: Database | null = null;
const DB_FILE_NAME = "nodelay.db";
const DATA_DIR_KEY = "nd-data-dir";

async function ensureEntriesTableNoUniqueDate(db: Database): Promise<void> {
  const tableMeta = await db.select<{ sql: string | null }[]>(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'entries'"
  );
  const entriesSql = tableMeta[0]?.sql ?? "";
  const hasUniqueDate = /UNIQUE\s*\(\s*date\s*\)/i.test(entriesSql);
  if (!hasUniqueDate) return;

  await db.execute("PRAGMA foreign_keys=OFF");
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS entries_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL DEFAULT '',
        topic_id INTEGER,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      )
    `);
    await db.execute(`
      INSERT INTO entries_new (id, date, title, content, topic_id, sort_order, created_at, updated_at)
      SELECT
        id,
        date,
        COALESCE(title, ''),
        COALESCE(content, ''),
        topic_id,
        COALESCE(sort_order, 0),
        COALESCE(created_at, datetime('now','localtime')),
        COALESCE(updated_at, datetime('now','localtime'))
      FROM entries
      ORDER BY id
    `);
    await db.execute("DROP TABLE entries");
    await db.execute("ALTER TABLE entries_new RENAME TO entries");
  } finally {
    await db.execute("PRAGMA foreign_keys=ON");
  }
}

async function getDefaultDataDir(): Promise<string> {
  return appDataDir();
}

export async function getDataDirectory(): Promise<string> {
  const savedDir = localStorage.getItem(DATA_DIR_KEY)?.trim();
  if (savedDir) return savedDir;
  return getDefaultDataDir();
}

export async function getDatabaseFilePath(): Promise<string> {
  const dataDir = await getDataDirectory();
  return join(dataDir, DB_FILE_NAME);
}

async function getConnectionString(): Promise<string> {
  const dbPath = await getDatabaseFilePath();
  return `sqlite:${dbPath}`;
}

async function copyDirectoryContents(fromDir: string, toDir: string): Promise<void> {
  let entries;
  try {
    entries = await readDir(fromDir);
  } catch {
    return;
  }
  await mkdir(toDir, { recursive: true });

  for (const entry of entries) {
    const source = await join(fromDir, entry.name);
    const target = await join(toDir, entry.name);
    if (entry.isDirectory) {
      await copyDirectoryContents(source, target);
    } else if (entry.isFile) {
      await copyFile(source, target);
    }
  }
}

export async function migrateDataDirectory(targetDir: string): Promise<void> {
  const nextDir = targetDir.trim();
  if (!nextDir) throw new Error("目标目录不能为空");

  const currentDir = await getDataDirectory();
  const [currentNormalized, nextNormalized] = await Promise.all([
    normalize(currentDir),
    normalize(nextDir),
  ]);
  if (currentNormalized === nextNormalized) return;

  if (db) {
    await db.close();
    db = null;
  }

  await copyDirectoryContents(currentDir, nextDir);
  localStorage.setItem(DATA_DIR_KEY, nextDir);
}

export async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load(await getConnectionString());
    await initSchema(db);
  }
  return db;
}

async function initSchema(db: Database) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    )
  `);
  // 兼容旧数据库：尝试添加 title 和 sort_order 列
  try {
    await db.execute(`ALTER TABLE entries ADD COLUMN title TEXT NOT NULL DEFAULT ''`);
  } catch (_) {}
  try {
    await db.execute(`ALTER TABLE entries ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0`);
  } catch (_) {}
  try {
    await db.execute(`ALTER TABLE entries ADD COLUMN topic_id INTEGER`);
  } catch (_) {}
  // 兼容旧库：移除旧的 UNIQUE(date) 约束（旧版本一天只有一条）
  await ensureEntriesTableNoUniqueDate(db);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#722ed1'
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#1677ff'
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS entry_tags (
      entry_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (entry_id, tag_id),
      FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `);
}

async function getTopicById(topicId: number | null): Promise<Topic | null> {
  if (!topicId) return null;
  const db = await getDb();
  const rows = await db.select<Topic[]>("SELECT * FROM topics WHERE id = $1", [topicId]);
  return rows[0] ?? null;
}

async function buildEntryWithRelations(entry: Entry): Promise<EntryWithTags> {
  const [topic, tags] = await Promise.all([
    getTopicById(entry.topic_id),
    getTagsForEntry(entry.id),
  ]);
  return { ...entry, topic, tags };
}

// ---- Entries ----

export async function getEntriesByDate(date: string): Promise<EntryWithTags[]> {
  const db = await getDb();
  const rows = await db.select<Entry[]>(
    "SELECT * FROM entries WHERE date = $1 ORDER BY sort_order, id",
    [date]
  );
  return Promise.all(rows.map((entry) => buildEntryWithRelations(entry)));
}

export async function getEntryById(id: number): Promise<EntryWithTags | null> {
  const db = await getDb();
  const rows = await db.select<Entry[]>("SELECT * FROM entries WHERE id = $1", [id]);
  if (rows.length === 0) return null;
  return buildEntryWithRelations(rows[0]);
}

export async function createEntry(
  date: string,
  title: string,
  content: string,
  topicId: number | null,
  tagIds: number[]
): Promise<EntryWithTags> {
  const db = await getDb();
  const insertWithAutoOrder = async () => {
    const orders = await db.select<{ max_order: number | null }[]>(
      "SELECT MAX(sort_order) as max_order FROM entries WHERE date = $1",
      [date]
    );
    const nextOrder = (orders[0]?.max_order ?? -1) + 1;
    await db.execute(
      `INSERT INTO entries (date, title, content, topic_id, sort_order, updated_at)
       VALUES ($1, $2, $3, $4, $5, datetime('now','localtime'))`,
      [date, title, content, topicId, nextOrder]
    );
  };

  try {
    await insertWithAutoOrder();
  } catch (e) {
    if (!String(e).includes("UNIQUE constraint failed: entries.date")) throw e;
    await ensureEntriesTableNoUniqueDate(db);
    await insertWithAutoOrder();
  }
  const rows = await db.select<Entry[]>(
    "SELECT * FROM entries WHERE date = $1 ORDER BY id DESC LIMIT 1",
    [date]
  );
  const entry = rows[0];
  await setTagsForEntry(entry.id, tagIds);
  return buildEntryWithRelations(entry);
}

export async function updateEntry(
  id: number,
  title: string,
  content: string,
  topicId: number | null,
  tagIds: number[]
): Promise<EntryWithTags> {
  const db = await getDb();
  await db.execute(
    `UPDATE entries SET title = $1, content = $2, topic_id = $3, updated_at = datetime('now','localtime') WHERE id = $4`,
    [title, content, topicId, id]
  );
  await setTagsForEntry(id, tagIds);
  const entry = await getEntryById(id);
  return entry!;
}

export async function deleteEntry(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM entries WHERE id = $1", [id]);
}

export async function getEntriesByMonth(
  year: number,
  month: number
): Promise<EntryWithTags[]> {
  const db = await getDb();
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  const rows = await db.select<Entry[]>(
    "SELECT * FROM entries WHERE date LIKE $1 ORDER BY date, sort_order, id",
    [`${prefix}-%`]
  );
  return Promise.all(rows.map((entry) => buildEntryWithRelations(entry)));
}

export async function getDatesWithEntriesByMonth(
  year: number,
  month: number
): Promise<{ date: string; entry_ids: number[] }[]> {
  const db = await getDb();
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  const rows = await db.select<{ date: string; id: number }[]>(
    `SELECT date, id FROM entries WHERE date LIKE $1 ORDER BY date, sort_order, id`,
    [`${prefix}-%`]
  );
  const map = new Map<string, number[]>();
  for (const row of rows) {
    if (!map.has(row.date)) map.set(row.date, []);
    map.get(row.date)!.push(row.id);
  }
  return Array.from(map.entries()).map(([date, entry_ids]) => ({ date, entry_ids }));
}

// ---- Topics ----

export async function getAllTopics(): Promise<Topic[]> {
  const db = await getDb();
  return db.select<Topic[]>("SELECT * FROM topics ORDER BY id");
}

export async function createTopic(name: string, color: string): Promise<Topic> {
  const db = await getDb();
  await db.execute("INSERT INTO topics (name, color) VALUES ($1, $2)", [name, color]);
  const rows = await db.select<Topic[]>("SELECT * FROM topics WHERE name = $1", [name]);
  return rows[0];
}

export async function updateTopic(id: number, name: string, color: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE topics SET name = $1, color = $2 WHERE id = $3", [name, color, id]);
}

export async function deleteTopic(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE entries SET topic_id = NULL WHERE topic_id = $1", [id]);
  await db.execute("DELETE FROM topics WHERE id = $1", [id]);
}

// ---- Tags ----

export async function getAllTags(): Promise<Tag[]> {
  const db = await getDb();
  return db.select<Tag[]>("SELECT * FROM tags ORDER BY id");
}

export async function createTag(name: string, color: string): Promise<Tag> {
  const db = await getDb();
  await db.execute("INSERT INTO tags (name, color) VALUES ($1, $2)", [name, color]);
  const rows = await db.select<Tag[]>("SELECT * FROM tags WHERE name = $1", [name]);
  return rows[0];
}

export async function updateTag(id: number, name: string, color: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE tags SET name = $1, color = $2 WHERE id = $3", [name, color, id]);
}

export async function deleteTag(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM tags WHERE id = $1", [id]);
}

export async function getTagsForEntry(entryId: number): Promise<Tag[]> {
  const db = await getDb();
  return db.select<Tag[]>(
    `SELECT t.* FROM tags t INNER JOIN entry_tags et ON t.id = et.tag_id WHERE et.entry_id = $1`,
    [entryId]
  );
}

export async function setTagsForEntry(entryId: number, tagIds: number[]): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM entry_tags WHERE entry_id = $1", [entryId]);
  for (const tagId of tagIds) {
    await db.execute(
      "INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES ($1, $2)",
      [entryId, tagId]
    );
  }
}

// ---- Search ----

export async function searchEntries(
  keyword: string,
  tagId?: number
): Promise<EntryWithTags[]> {
  const db = await getDb();
  let rows: Entry[];
  if (tagId) {
    rows = await db.select<Entry[]>(
      `SELECT DISTINCT e.* FROM entries e
       INNER JOIN entry_tags et ON e.id = et.entry_id
       WHERE et.tag_id = $1 AND (e.title LIKE $2 OR e.content LIKE $2)
       ORDER BY e.date DESC, e.sort_order`,
      [tagId, `%${keyword}%`]
    );
  } else {
    rows = await db.select<Entry[]>(
      "SELECT * FROM entries WHERE title LIKE $1 OR content LIKE $1 ORDER BY date DESC, sort_order",
      [`%${keyword}%`]
    );
  }
  return Promise.all(rows.map((entry) => buildEntryWithRelations(entry)));
}

// ---- Export ----

export async function getEntriesForExport(
  year: number,
  month: number
): Promise<EntryWithTags[]> {
  return getEntriesByMonth(year, month);
}
