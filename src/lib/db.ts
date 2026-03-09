import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { CLASS_NUMBERS, DEFAULT_LESSON_ITEMS } from "@/lib/constants";
import type {
  LatestProgress,
  LessonCheck,
  LessonItem,
  LessonRow,
  LessonStatus,
} from "@/lib/types";

const configuredDbPath = process.env.LESSON_PROGRESS_DB_PATH;
const configuredDataDir = process.env.LESSON_PROGRESS_DATA_DIR;
const dataDir = configuredDbPath
  ? path.dirname(configuredDbPath)
  : configuredDataDir || path.join(process.cwd(), "data");
const dbPath = configuredDbPath || path.join(dataDir, "lesson-progress.sqlite");

fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON");
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA busy_timeout = 5000");
db.exec(`
  CREATE TABLE IF NOT EXISTS lesson_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS lesson_rows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_date TEXT NOT NULL,
    period INTEGER NOT NULL,
    lesson_item_id INTEGER NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lesson_item_id) REFERENCES lesson_items(id)
  );

  CREATE TABLE IF NOT EXISTS lesson_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_row_id INTEGER NOT NULL,
    class_no INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'EMPTY',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lesson_row_id) REFERENCES lesson_rows(id) ON DELETE CASCADE,
    UNIQUE (lesson_row_id, class_no)
  );

  CREATE INDEX IF NOT EXISTS idx_lesson_items_sort_order ON lesson_items(sort_order);
  CREATE INDEX IF NOT EXISTS idx_lesson_rows_date_period ON lesson_rows(lesson_date DESC, period ASC);
  CREATE INDEX IF NOT EXISTS idx_lesson_checks_row_id ON lesson_checks(lesson_row_id);
`);

seedDefaultLessonItems();

type LessonItemRow = {
  id: number;
  title: string;
  sort_order: number;
  is_active: number;
  created_at: string;
};

type LessonCheckRow = {
  id: number;
  lesson_row_id: number;
  class_no: number;
  status: LessonStatus;
  updated_at: string;
};

type LessonRowResult = {
  row_id: number;
  lesson_date: string;
  period: number;
  note: string | null;
  row_created_at: string;
  lesson_item_id: number;
  lesson_item_title: string;
  check_id: number;
  class_no: number;
  status: LessonStatus;
  check_updated_at: string;
};

type ProgressRow = {
  class_no: number;
  status: LessonStatus;
  lesson_date: string;
  period: number;
  lesson_item_title: string;
};

function seedDefaultLessonItems() {
  const countResult = db.prepare("SELECT COUNT(*) AS count FROM lesson_items").get() as {
    count: number;
  };

  if (countResult.count > 0) {
    return;
  }

  const insert = db.prepare(
    "INSERT INTO lesson_items (title, sort_order, is_active) VALUES (?, ?, 1)",
  );

  DEFAULT_LESSON_ITEMS.forEach((title, index) => {
    insert.run(title, index + 1);
  });
}

function mapLessonItem(row: LessonItemRow): LessonItem {
  return {
    id: row.id,
    title: row.title,
    sortOrder: row.sort_order,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
  };
}

function mapLessonCheck(row: LessonCheckRow): LessonCheck {
  return {
    id: row.id,
    lessonRowId: row.lesson_row_id,
    classNo: row.class_no,
    status: row.status,
    updatedAt: row.updated_at,
  };
}

function normalizeLessonItemOrder() {
  const rows = db
    .prepare("SELECT id FROM lesson_items ORDER BY sort_order ASC, id ASC")
    .all() as Array<{ id: number }>;

  const update = db.prepare("UPDATE lesson_items SET sort_order = ? WHERE id = ?");

  rows.forEach((row, index) => {
    update.run(index + 1, row.id);
  });
}

function validateLessonRowFields(data: {
  lessonDate: string;
  period: number;
  lessonItemId: number;
}) {
  if (!data.lessonDate.trim()) {
    throw new Error("날짜를 입력해 주세요.");
  }

  if (data.period < 1 || data.period > 7) {
    throw new Error("교시는 1교시부터 7교시까지만 가능합니다.");
  }

  getLessonItemById(data.lessonItemId);
}

export function getLessonItems(includeInactive = true): LessonItem[] {
  const rows = db
    .prepare(
      `
      SELECT id, title, sort_order, is_active, created_at
      FROM lesson_items
      ${includeInactive ? "" : "WHERE is_active = 1"}
      ORDER BY sort_order ASC, id ASC
      `,
    )
    .all() as LessonItemRow[];

  return rows.map(mapLessonItem);
}

export function getLessonItemById(id: number): LessonItem {
  const row = db
    .prepare(
      "SELECT id, title, sort_order, is_active, created_at FROM lesson_items WHERE id = ?",
    )
    .get(id) as LessonItemRow | undefined;

  if (!row) {
    throw new Error("수업내용을 찾을 수 없습니다.");
  }

  return mapLessonItem(row);
}

export function createLessonItem(title: string): LessonItem {
  const trimmed = title.trim();

  if (!trimmed) {
    throw new Error("수업내용을 입력해 주세요.");
  }

  const nextSortOrder = db
    .prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 AS nextSortOrder FROM lesson_items")
    .get() as { nextSortOrder: number };

  const result = db
    .prepare("INSERT INTO lesson_items (title, sort_order, is_active) VALUES (?, ?, 1)")
    .run(trimmed, nextSortOrder.nextSortOrder);

  return getLessonItemById(Number(result.lastInsertRowid));
}

export function updateLessonItem(
  id: number,
  data: { title?: string; isActive?: boolean },
): LessonItem {
  const existing = getLessonItemById(id);
  const title = data.title?.trim() ? data.title.trim() : existing.title;
  const isActive = data.isActive ?? existing.isActive;

  db.prepare("UPDATE lesson_items SET title = ?, is_active = ? WHERE id = ?").run(
    title,
    isActive ? 1 : 0,
    id,
  );

  return getLessonItemById(id);
}

export function deleteLessonItem(id: number) {
  getLessonItemById(id);

  const usage = db
    .prepare("SELECT COUNT(*) AS count FROM lesson_rows WHERE lesson_item_id = ?")
    .get(id) as { count: number };

  if (usage.count > 0) {
    throw new Error("이미 수업 기록에 사용된 항목은 삭제할 수 없습니다. 비활성화를 사용해 주세요.");
  }

  db.exec("BEGIN");

  try {
    db.prepare("DELETE FROM lesson_items WHERE id = ?").run(id);
    normalizeLessonItemOrder();
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function reorderLessonItems(ids: number[]) {
  const uniqueIds = [...new Set(ids)];
  const items = getLessonItems(true);

  if (uniqueIds.length !== items.length) {
    throw new Error("정렬 대상이 현재 항목 수와 일치하지 않습니다.");
  }

  db.exec("BEGIN");

  try {
    const update = db.prepare("UPDATE lesson_items SET sort_order = ? WHERE id = ?");
    uniqueIds.forEach((id, index) => {
      update.run(index + 1, id);
    });
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function getLessonRows(date?: string): LessonRow[] {
  const query = `
    SELECT
      lr.id AS row_id,
      lr.lesson_date,
      lr.period,
      lr.note,
      lr.created_at AS row_created_at,
      li.id AS lesson_item_id,
      li.title AS lesson_item_title,
      lc.id AS check_id,
      lc.class_no,
      lc.status,
      lc.updated_at AS check_updated_at
    FROM lesson_rows lr
    INNER JOIN lesson_items li ON li.id = lr.lesson_item_id
    INNER JOIN lesson_checks lc ON lc.lesson_row_id = lr.id
    ${date ? "WHERE lr.lesson_date = ?" : ""}
    ORDER BY lr.lesson_date DESC, lr.period ASC, lr.id DESC, lc.class_no ASC
  `;

  const rows = db.prepare(query).all(...(date ? [date] : [])) as LessonRowResult[];
  const grouped = new Map<number, LessonRow>();

  rows.forEach((row) => {
    const check = mapLessonCheck({
      id: row.check_id,
      lesson_row_id: row.row_id,
      class_no: row.class_no,
      status: row.status,
      updated_at: row.check_updated_at,
    });

    const existing = grouped.get(row.row_id);

    if (existing) {
      existing.checks.push(check);
      return;
    }

    grouped.set(row.row_id, {
      id: row.row_id,
      lessonDate: row.lesson_date,
      period: row.period,
      note: row.note,
      createdAt: row.row_created_at,
      lessonItemId: row.lesson_item_id,
      lessonItemTitle: row.lesson_item_title,
      checks: [check],
    });
  });

  return [...grouped.values()];
}

export function createLessonRow(data: {
  lessonDate: string;
  period: number;
  lessonItemId: number;
  note?: string;
}): LessonRow {
  const lessonDate = data.lessonDate.trim();
  const note = data.note?.trim() || null;

  validateLessonRowFields({
    lessonDate,
    period: data.period,
    lessonItemId: data.lessonItemId,
  });

  db.exec("BEGIN");

  try {
    const result = db
      .prepare(
        "INSERT INTO lesson_rows (lesson_date, period, lesson_item_id, note) VALUES (?, ?, ?, ?)",
      )
      .run(lessonDate, data.period, data.lessonItemId, note);

    const lessonRowId = Number(result.lastInsertRowid);
    const insertCheck = db.prepare(
      "INSERT INTO lesson_checks (lesson_row_id, class_no, status) VALUES (?, ?, 'EMPTY')",
    );

    CLASS_NUMBERS.forEach((classNo) => {
      insertCheck.run(lessonRowId, classNo);
    });

    db.exec("COMMIT");
    return getLessonRowById(lessonRowId);
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function getLessonRowById(id: number): LessonRow {
  const row = getLessonRows().find((currentRow) => currentRow.id === id);

  if (!row) {
    throw new Error("수업행을 찾을 수 없습니다.");
  }

  return row;
}

export function updateLessonRow(
  id: number,
  data: { lessonDate: string; period: number; lessonItemId: number },
): LessonRow {
  const existing = getLessonRowById(id);
  const lessonDate = data.lessonDate.trim();

  validateLessonRowFields({
    lessonDate,
    period: data.period,
    lessonItemId: data.lessonItemId,
  });

  db.prepare(
    `
    UPDATE lesson_rows
    SET lesson_date = ?, period = ?, lesson_item_id = ?
    WHERE id = ?
    `,
  ).run(lessonDate, data.period, data.lessonItemId, id);

  const updated = getLessonRows().find((currentRow) => currentRow.id === id);

  if (!updated) {
    throw new Error("수업행 수정 후 조회에 실패했습니다.");
  }

  return {
    ...updated,
    note: existing.note,
  };
}

export function updateLessonCheck(id: number, status: LessonStatus): LessonCheck {
  if (!["EMPTY", "O", "X"].includes(status)) {
    throw new Error("상태 값이 올바르지 않습니다.");
  }

  db.prepare(
    "UPDATE lesson_checks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
  ).run(status, id);

  const row = db
    .prepare(
      `
      SELECT id, lesson_row_id, class_no, status, updated_at
      FROM lesson_checks
      WHERE id = ?
      `,
    )
    .get(id) as LessonCheckRow | undefined;

  if (!row) {
    throw new Error("체크 항목을 찾을 수 없습니다.");
  }

  return mapLessonCheck(row);
}

export function getLatestProgressByClass(): LatestProgress[] {
  const rows = db
    .prepare(
      `
      SELECT
        lc.class_no,
        lc.status,
        lr.lesson_date,
        lr.period,
        li.title AS lesson_item_title
      FROM lesson_checks lc
      INNER JOIN lesson_rows lr ON lr.id = lc.lesson_row_id
      INNER JOIN lesson_items li ON li.id = lr.lesson_item_id
      WHERE lc.status IN ('O', 'X')
      ORDER BY lc.class_no ASC, lr.lesson_date DESC, lr.period DESC, lc.updated_at DESC
      `,
    )
    .all() as ProgressRow[];

  const latestMap = new Map<number, LatestProgress>();

  rows.forEach((row) => {
    if (!latestMap.has(row.class_no)) {
      latestMap.set(row.class_no, {
        classNo: row.class_no,
        status: row.status,
        lessonDate: row.lesson_date,
        period: row.period,
        lessonItemTitle: row.lesson_item_title,
      });
    }
  });

  return CLASS_NUMBERS.map((classNo) => {
    return (
      latestMap.get(classNo) ?? {
        classNo,
        status: null,
        lessonDate: null,
        period: null,
        lessonItemTitle: null,
      }
    );
  });
}
