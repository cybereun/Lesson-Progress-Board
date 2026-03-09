import postgres from "postgres";
import { CLASS_NUMBERS, DEFAULT_LESSON_ITEMS } from "@/lib/constants";
import type {
  LatestProgress,
  LessonCheck,
  LessonItem,
  LessonRow,
  LessonStatus,
} from "@/lib/types";

type LessonStore = {
  getLessonItems(includeInactive: boolean): Promise<LessonItem[]>;
  getLessonItemById(id: number): Promise<LessonItem>;
  createLessonItem(title: string): Promise<LessonItem>;
  updateLessonItem(id: number, data: { title?: string; isActive?: boolean }): Promise<LessonItem>;
  deleteLessonItem(id: number): Promise<void>;
  reorderLessonItems(ids: number[]): Promise<void>;
  getLessonRows(date?: string): Promise<LessonRow[]>;
  getLessonRowById(id: number): Promise<LessonRow>;
  createLessonRow(data: {
    lessonDate: string;
    period: number;
    lessonItemId: number;
    note?: string;
  }): Promise<LessonRow>;
  updateLessonRow(
    id: number,
    data: { lessonDate: string; period: number; lessonItemId: number },
  ): Promise<LessonRow>;
  updateLessonCheck(id: number, status: LessonStatus): Promise<LessonCheck>;
  getLatestProgressByClass(): Promise<LatestProgress[]>;
};

type LessonItemRow = {
  id: number;
  title: string;
  sort_order: number;
  is_active: boolean | number;
  created_at: string | Date;
};

type LessonCheckRow = {
  id: number;
  lesson_row_id: number;
  class_no: number;
  status: LessonStatus;
  updated_at: string | Date;
};

type LessonRowResult = {
  row_id: number;
  lesson_date: string | Date;
  period: number;
  note: string | null;
  row_created_at: string | Date;
  lesson_item_id: number;
  lesson_item_title: string;
  check_id: number;
  class_no: number;
  status: LessonStatus;
  check_updated_at: string | Date;
};

type ProgressRow = {
  class_no: number;
  status: LessonStatus;
  lesson_date: string | Date;
  period: number;
  lesson_item_title: string;
};

type MemoryState = {
  nextLessonItemId: number;
  nextLessonRowId: number;
  nextLessonCheckId: number;
  lessonItems: LessonItem[];
  lessonRows: Array<Omit<LessonRow, "checks" | "lessonItemTitle">>;
  lessonChecks: LessonCheck[];
};

function normalizeTimestamp(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

function normalizeDateOnly(value: string | Date): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10);
}

function mapLessonItem(row: LessonItemRow): LessonItem {
  return {
    id: Number(row.id),
    title: row.title,
    sortOrder: Number(row.sort_order),
    isActive: Boolean(row.is_active),
    createdAt: normalizeTimestamp(row.created_at),
  };
}

function mapLessonCheck(row: LessonCheckRow): LessonCheck {
  return {
    id: Number(row.id),
    lessonRowId: Number(row.lesson_row_id),
    classNo: Number(row.class_no),
    status: row.status,
    updatedAt: normalizeTimestamp(row.updated_at),
  };
}

function buildLessonRows(rows: LessonRowResult[]): LessonRow[] {
  const grouped = new Map<number, LessonRow>();

  for (const row of rows) {
    const check = mapLessonCheck({
      id: row.check_id,
      lesson_row_id: row.row_id,
      class_no: row.class_no,
      status: row.status,
      updated_at: row.check_updated_at,
    });

    const existing = grouped.get(Number(row.row_id));
    if (existing) {
      existing.checks.push(check);
      continue;
    }

    grouped.set(Number(row.row_id), {
      id: Number(row.row_id),
      lessonDate: normalizeDateOnly(row.lesson_date),
      period: Number(row.period),
      note: row.note,
      createdAt: normalizeTimestamp(row.row_created_at),
      lessonItemId: Number(row.lesson_item_id),
      lessonItemTitle: row.lesson_item_title,
      checks: [check],
    });
  }

  return [...grouped.values()];
}

function buildLatestProgress(rows: ProgressRow[]): LatestProgress[] {
  const latestMap = new Map<number, LatestProgress>();

  for (const row of rows) {
    const classNo = Number(row.class_no);
    if (!latestMap.has(classNo)) {
      latestMap.set(classNo, {
        classNo,
        status: row.status,
        lessonDate: normalizeDateOnly(row.lesson_date),
        period: Number(row.period),
        lessonItemTitle: row.lesson_item_title,
      });
    }
  }

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

async function validateLessonRowFields(
  store: LessonStore,
  data: { lessonDate: string; period: number; lessonItemId: number },
) {
  if (!data.lessonDate.trim()) {
    throw new Error("날짜를 입력해 주세요.");
  }

  if (data.period < 1 || data.period > 7) {
    throw new Error("교시는 1교시부터 7교시까지만 가능합니다.");
  }

  await store.getLessonItemById(data.lessonItemId);
}

function createMemoryState(): MemoryState {
  const now = new Date().toISOString();
  const lessonItems = DEFAULT_LESSON_ITEMS.map((title, index) => ({
    id: index + 1,
    title,
    sortOrder: index + 1,
    isActive: true,
    createdAt: now,
  }));

  return {
    nextLessonItemId: lessonItems.length + 1,
    nextLessonRowId: 1,
    nextLessonCheckId: 1,
    lessonItems,
    lessonRows: [],
    lessonChecks: [],
  };
}

function getMemoryState(): MemoryState {
  const globalState = globalThis as typeof globalThis & {
    __lessonProgressMemoryState?: MemoryState;
  };

  if (!globalState.__lessonProgressMemoryState) {
    globalState.__lessonProgressMemoryState = createMemoryState();
  }

  return globalState.__lessonProgressMemoryState;
}

function createMemoryStore(): LessonStore {
  const state = getMemoryState();

  function sortLessonItems() {
    state.lessonItems.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  }

  function sortLessonRows(rows: LessonRow[]) {
    rows.sort((a, b) => {
      if (a.lessonDate !== b.lessonDate) {
        return a.lessonDate < b.lessonDate ? 1 : -1;
      }
      if (a.period !== b.period) {
        return a.period - b.period;
      }
      return b.id - a.id;
    });
  }

  async function getLessonItemById(id: number): Promise<LessonItem> {
    const item = state.lessonItems.find((currentItem) => currentItem.id === id);
    if (!item) {
      throw new Error("수업내용을 찾을 수 없습니다.");
    }
    return { ...item };
  }

  async function getLessonRows(date?: string): Promise<LessonRow[]> {
    const filteredRows = state.lessonRows.filter((row) => (date ? row.lessonDate === date : true));
    const itemsById = new Map(state.lessonItems.map((item) => [item.id, item.title]));
    const rows = filteredRows.map((row) => ({
      id: row.id,
      lessonDate: row.lessonDate,
      period: row.period,
      note: row.note,
      createdAt: row.createdAt,
      lessonItemId: row.lessonItemId,
      lessonItemTitle: itemsById.get(row.lessonItemId) ?? "",
      checks: state.lessonChecks
        .filter((check) => check.lessonRowId === row.id)
        .sort((a, b) => a.classNo - b.classNo)
        .map((check) => ({ ...check })),
    }));

    sortLessonRows(rows);
    return rows;
  }

  const store: LessonStore = {
    async getLessonItems(includeInactive) {
      sortLessonItems();
      return state.lessonItems
        .filter((item) => (includeInactive ? true : item.isActive))
        .map((item) => ({ ...item }));
    },

    getLessonItemById,

    async createLessonItem(title) {
      const trimmed = title.trim();
      if (!trimmed) {
        throw new Error("수업내용을 입력해 주세요.");
      }

      const item: LessonItem = {
        id: state.nextLessonItemId++,
        title: trimmed,
        sortOrder: state.lessonItems.length + 1,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      state.lessonItems.push(item);
      return { ...item };
    },

    async updateLessonItem(id, data) {
      const index = state.lessonItems.findIndex((item) => item.id === id);
      if (index === -1) {
        throw new Error("수업내용을 찾을 수 없습니다.");
      }

      const currentItem = state.lessonItems[index];
      state.lessonItems[index] = {
        ...currentItem,
        title: data.title?.trim() ? data.title.trim() : currentItem.title,
        isActive: data.isActive ?? currentItem.isActive,
      };

      return { ...state.lessonItems[index] };
    },

    async deleteLessonItem(id) {
      await getLessonItemById(id);

      const used = state.lessonRows.some((row) => row.lessonItemId === id);
      if (used) {
        throw new Error("이미 수업 기록에 사용된 항목은 삭제할 수 없습니다. 비활성화를 사용해 주세요.");
      }

      state.lessonItems = state.lessonItems.filter((item) => item.id !== id);
      state.lessonItems.forEach((item, index) => {
        item.sortOrder = index + 1;
      });
    },

    async reorderLessonItems(ids) {
      const uniqueIds = [...new Set(ids)];
      if (uniqueIds.length !== state.lessonItems.length) {
        throw new Error("정렬 대상이 현재 항목 수와 일치하지 않습니다.");
      }

      const itemMap = new Map(state.lessonItems.map((item) => [item.id, item]));
      state.lessonItems = uniqueIds.map((id, index) => {
        const item = itemMap.get(id);
        if (!item) {
          throw new Error("정렬 대상에 없는 항목이 포함되어 있습니다.");
        }

        return { ...item, sortOrder: index + 1 };
      });
    },

    getLessonRows,

    async getLessonRowById(id) {
      const row = (await getLessonRows()).find((currentRow) => currentRow.id === id);
      if (!row) {
        throw new Error("수업행을 찾을 수 없습니다.");
      }
      return row;
    },

    async createLessonRow(data) {
      const lessonDate = data.lessonDate.trim();
      await validateLessonRowFields(store, {
        lessonDate,
        period: data.period,
        lessonItemId: data.lessonItemId,
      });

      const rowId = state.nextLessonRowId++;
      state.lessonRows.push({
        id: rowId,
        lessonDate,
        period: data.period,
        note: data.note?.trim() || null,
        createdAt: new Date().toISOString(),
        lessonItemId: data.lessonItemId,
      });

      for (const classNo of CLASS_NUMBERS) {
        state.lessonChecks.push({
          id: state.nextLessonCheckId++,
          lessonRowId: rowId,
          classNo,
          status: "EMPTY",
          updatedAt: new Date().toISOString(),
        });
      }

      return store.getLessonRowById(rowId);
    },

    async updateLessonRow(id, data) {
      const rowIndex = state.lessonRows.findIndex((row) => row.id === id);
      if (rowIndex === -1) {
        throw new Error("수업행을 찾을 수 없습니다.");
      }

      const lessonDate = data.lessonDate.trim();
      await validateLessonRowFields(store, {
        lessonDate,
        period: data.period,
        lessonItemId: data.lessonItemId,
      });

      state.lessonRows[rowIndex] = {
        ...state.lessonRows[rowIndex],
        lessonDate,
        period: data.period,
        lessonItemId: data.lessonItemId,
      };

      return store.getLessonRowById(id);
    },

    async updateLessonCheck(id, status) {
      if (!["EMPTY", "O", "X"].includes(status)) {
        throw new Error("상태 값이 올바르지 않습니다.");
      }

      const checkIndex = state.lessonChecks.findIndex((check) => check.id === id);
      if (checkIndex === -1) {
        throw new Error("체크 항목을 찾을 수 없습니다.");
      }

      state.lessonChecks[checkIndex] = {
        ...state.lessonChecks[checkIndex],
        status,
        updatedAt: new Date().toISOString(),
      };

      return { ...state.lessonChecks[checkIndex] };
    },

    async getLatestProgressByClass() {
      const rows = await getLessonRows();
      const latestMap = new Map<number, LatestProgress>();

      for (const row of rows) {
        for (const check of row.checks) {
          if (check.status === "EMPTY" || latestMap.has(check.classNo)) {
            continue;
          }

          latestMap.set(check.classNo, {
            classNo: check.classNo,
            status: check.status,
            lessonDate: row.lessonDate,
            period: row.period,
            lessonItemTitle: row.lessonItemTitle,
          });
        }
      }

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
    },
  };

  return store;
}

async function createSqliteStore(): Promise<LessonStore> {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const sqlite = (await import("node:sqlite")) as typeof import("node:sqlite");
  const configuredDbPath = process.env.LESSON_PROGRESS_DB_PATH;
  const configuredDataDir = process.env.LESSON_PROGRESS_DATA_DIR;
  const dataDir = configuredDbPath
    ? path.dirname(configuredDbPath)
    : configuredDataDir || path.join(process.cwd(), "data");
  const dbPath = configuredDbPath || path.join(dataDir, "lesson-progress.sqlite");

  fs.mkdirSync(dataDir, { recursive: true });

  const db = new sqlite.DatabaseSync(dbPath);
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

  const countResult = db.prepare("SELECT COUNT(*) AS count FROM lesson_items").get() as {
    count: number;
  };

  if (countResult.count === 0) {
    const insert = db.prepare(
      "INSERT INTO lesson_items (title, sort_order, is_active) VALUES (?, ?, 1)",
    );
    DEFAULT_LESSON_ITEMS.forEach((title, index) => {
      insert.run(title, index + 1);
    });
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

  async function getLessonItemById(id: number): Promise<LessonItem> {
    const row = db
      .prepare("SELECT id, title, sort_order, is_active, created_at FROM lesson_items WHERE id = ?")
      .get(id) as LessonItemRow | undefined;

    if (!row) {
      throw new Error("수업내용을 찾을 수 없습니다.");
    }

    return mapLessonItem(row);
  }

  async function getLessonRows(date?: string): Promise<LessonRow[]> {
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
    return buildLessonRows(rows);
  }

  const store: LessonStore = {
    async getLessonItems(includeInactive) {
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
    },

    getLessonItemById,

    async createLessonItem(title) {
      const trimmed = title.trim();
      if (!trimmed) {
        throw new Error("수업내용을 입력해 주세요.");
      }

      const nextSortOrder = db
        .prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_sort_order FROM lesson_items")
        .get() as { next_sort_order: number };

      const result = db
        .prepare("INSERT INTO lesson_items (title, sort_order, is_active) VALUES (?, ?, 1)")
        .run(trimmed, nextSortOrder.next_sort_order);

      return getLessonItemById(Number(result.lastInsertRowid));
    },

    async updateLessonItem(id, data) {
      const existing = await getLessonItemById(id);
      db.prepare("UPDATE lesson_items SET title = ?, is_active = ? WHERE id = ?").run(
        data.title?.trim() ? data.title.trim() : existing.title,
        (data.isActive ?? existing.isActive) ? 1 : 0,
        id,
      );

      return getLessonItemById(id);
    },

    async deleteLessonItem(id) {
      await getLessonItemById(id);

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
    },

    async reorderLessonItems(ids) {
      const uniqueIds = [...new Set(ids)];
      const items = await store.getLessonItems(true);

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
    },

    getLessonRows,

    async getLessonRowById(id) {
      const row = (await getLessonRows()).find((currentRow) => currentRow.id === id);
      if (!row) {
        throw new Error("수업행을 찾을 수 없습니다.");
      }
      return row;
    },

    async createLessonRow(data) {
      const lessonDate = data.lessonDate.trim();
      const note = data.note?.trim() || null;

      await validateLessonRowFields(store, {
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
        return store.getLessonRowById(lessonRowId);
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },

    async updateLessonRow(id, data) {
      await store.getLessonRowById(id);
      const lessonDate = data.lessonDate.trim();

      await validateLessonRowFields(store, {
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

      return store.getLessonRowById(id);
    },

    async updateLessonCheck(id, status) {
      if (!["EMPTY", "O", "X"].includes(status)) {
        throw new Error("상태 값이 올바르지 않습니다.");
      }

      db.prepare("UPDATE lesson_checks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
        status,
        id,
      );

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
    },

    async getLatestProgressByClass() {
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

      return buildLatestProgress(rows);
    },
  };

  return store;
}

async function createPostgresStore(connectionString: string): Promise<LessonStore> {
  const sql = postgres(connectionString, {
    prepare: false,
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
  });

  await sql`
    CREATE TABLE IF NOT EXISTS lesson_items (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS lesson_rows (
      id BIGSERIAL PRIMARY KEY,
      lesson_date DATE NOT NULL,
      period INTEGER NOT NULL,
      lesson_item_id BIGINT NOT NULL REFERENCES lesson_items(id),
      note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS lesson_checks (
      id BIGSERIAL PRIMARY KEY,
      lesson_row_id BIGINT NOT NULL REFERENCES lesson_rows(id) ON DELETE CASCADE,
      class_no INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'EMPTY',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (lesson_row_id, class_no)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_lesson_items_sort_order ON lesson_items(sort_order)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_lesson_rows_date_period ON lesson_rows(lesson_date DESC, period ASC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_lesson_checks_row_id ON lesson_checks(lesson_row_id)`;

  const countRows = await sql<{ count: string }[]>`SELECT COUNT(*)::text AS count FROM lesson_items`;
  if (Number(countRows[0]?.count ?? "0") === 0) {
    for (const [index, title] of DEFAULT_LESSON_ITEMS.entries()) {
      await sql`
        INSERT INTO lesson_items (title, sort_order, is_active)
        VALUES (${title}, ${index + 1}, TRUE)
      `;
    }
  }

  async function getLessonItemById(id: number): Promise<LessonItem> {
    const rows = await sql<LessonItemRow[]>`
      SELECT id, title, sort_order, is_active, created_at
      FROM lesson_items
      WHERE id = ${id}
    `;

    if (rows.length === 0) {
      throw new Error("수업내용을 찾을 수 없습니다.");
    }

    return mapLessonItem(rows[0]);
  }

  async function getLessonRows(date?: string): Promise<LessonRow[]> {
    const rows = date
      ? await sql<LessonRowResult[]>`
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
          WHERE lr.lesson_date = ${date}
          ORDER BY lr.lesson_date DESC, lr.period ASC, lr.id DESC, lc.class_no ASC
        `
      : await sql<LessonRowResult[]>`
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
          ORDER BY lr.lesson_date DESC, lr.period ASC, lr.id DESC, lc.class_no ASC
        `;

    return buildLessonRows(rows);
  }

  const store: LessonStore = {
    async getLessonItems(includeInactive) {
      const rows = includeInactive
        ? await sql<LessonItemRow[]>`
            SELECT id, title, sort_order, is_active, created_at
            FROM lesson_items
            ORDER BY sort_order ASC, id ASC
          `
        : await sql<LessonItemRow[]>`
            SELECT id, title, sort_order, is_active, created_at
            FROM lesson_items
            WHERE is_active = TRUE
            ORDER BY sort_order ASC, id ASC
          `;

      return rows.map(mapLessonItem);
    },

    getLessonItemById,

    async createLessonItem(title) {
      const trimmed = title.trim();
      if (!trimmed) {
        throw new Error("수업내용을 입력해 주세요.");
      }

      const nextSortOrderRows = await sql<{ next_sort_order: number }[]>`
        SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_sort_order
        FROM lesson_items
      `;
      const nextSortOrder = Number(nextSortOrderRows[0]?.next_sort_order ?? 1);

      const rows = await sql<{ id: number }[]>`
        INSERT INTO lesson_items (title, sort_order, is_active)
        VALUES (${trimmed}, ${nextSortOrder}, TRUE)
        RETURNING id
      `;

      return getLessonItemById(Number(rows[0].id));
    },

    async updateLessonItem(id, data) {
      const existing = await getLessonItemById(id);

      await sql`
        UPDATE lesson_items
        SET title = ${data.title?.trim() ? data.title.trim() : existing.title},
            is_active = ${data.isActive ?? existing.isActive}
        WHERE id = ${id}
      `;

      return getLessonItemById(id);
    },

    async deleteLessonItem(id) {
      await getLessonItemById(id);

      const usageRows = await sql<{ count: string }[]>`
        SELECT COUNT(*)::text AS count
        FROM lesson_rows
        WHERE lesson_item_id = ${id}
      `;
      if (Number(usageRows[0]?.count ?? "0") > 0) {
        throw new Error("이미 수업 기록에 사용된 항목은 삭제할 수 없습니다. 비활성화를 사용해 주세요.");
      }

      await sql.begin(async (rawTx) => {
        const tx = rawTx as unknown as ReturnType<typeof postgres>;
        await tx`DELETE FROM lesson_items WHERE id = ${id}`;

        const itemIds = await tx<{ id: number }[]>`
          SELECT id
          FROM lesson_items
          ORDER BY sort_order ASC, id ASC
        `;

        for (const [index, row] of itemIds.entries()) {
          await tx`UPDATE lesson_items SET sort_order = ${index + 1} WHERE id = ${row.id}`;
        }
      });
    },

    async reorderLessonItems(ids) {
      const uniqueIds = [...new Set(ids)];
      const items = await store.getLessonItems(true);

      if (uniqueIds.length !== items.length) {
        throw new Error("정렬 대상이 현재 항목 수와 일치하지 않습니다.");
      }

      await sql.begin(async (rawTx) => {
        const tx = rawTx as unknown as ReturnType<typeof postgres>;
        for (const [index, id] of uniqueIds.entries()) {
          await tx`UPDATE lesson_items SET sort_order = ${index + 1} WHERE id = ${id}`;
        }
      });
    },

    getLessonRows,

    async getLessonRowById(id) {
      const row = (await getLessonRows()).find((currentRow) => currentRow.id === id);
      if (!row) {
        throw new Error("수업행을 찾을 수 없습니다.");
      }
      return row;
    },

    async createLessonRow(data) {
      const lessonDate = data.lessonDate.trim();
      const note = data.note?.trim() || null;

      await validateLessonRowFields(store, {
        lessonDate,
        period: data.period,
        lessonItemId: data.lessonItemId,
      });

      let lessonRowId = 0;

      await sql.begin(async (rawTx) => {
        const tx = rawTx as unknown as ReturnType<typeof postgres>;
        const rows = await tx<{ id: number }[]>`
          INSERT INTO lesson_rows (lesson_date, period, lesson_item_id, note)
          VALUES (${lessonDate}, ${data.period}, ${data.lessonItemId}, ${note})
          RETURNING id
        `;
        lessonRowId = Number(rows[0].id);

        for (const classNo of CLASS_NUMBERS) {
          await tx`
            INSERT INTO lesson_checks (lesson_row_id, class_no, status)
            VALUES (${lessonRowId}, ${classNo}, 'EMPTY')
          `;
        }
      });

      return store.getLessonRowById(lessonRowId);
    },

    async updateLessonRow(id, data) {
      await store.getLessonRowById(id);
      const lessonDate = data.lessonDate.trim();

      await validateLessonRowFields(store, {
        lessonDate,
        period: data.period,
        lessonItemId: data.lessonItemId,
      });

      await sql`
        UPDATE lesson_rows
        SET lesson_date = ${lessonDate},
            period = ${data.period},
            lesson_item_id = ${data.lessonItemId}
        WHERE id = ${id}
      `;

      return store.getLessonRowById(id);
    },

    async updateLessonCheck(id, status) {
      if (!["EMPTY", "O", "X"].includes(status)) {
        throw new Error("상태 값이 올바르지 않습니다.");
      }

      const rows = await sql<LessonCheckRow[]>`
        UPDATE lesson_checks
        SET status = ${status},
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, lesson_row_id, class_no, status, updated_at
      `;

      if (rows.length === 0) {
        throw new Error("체크 항목을 찾을 수 없습니다.");
      }

      return mapLessonCheck(rows[0]);
    },

    async getLatestProgressByClass() {
      const rows = await sql<ProgressRow[]>`
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
      `;

      return buildLatestProgress(rows);
    },
  };

  return store;
}

async function createStore(): Promise<LessonStore> {
  const postgresUrl =
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL_NON_POOLING;

  if (postgresUrl) {
    return createPostgresStore(postgresUrl);
  }

  if (process.env.VERCEL) {
    console.warn(
      "No Postgres connection string found on Vercel. Falling back to in-memory storage.",
    );
    return createMemoryStore();
  }

  return createSqliteStore();
}

let storePromise: Promise<LessonStore> | undefined;

async function getStore(): Promise<LessonStore> {
  if (!storePromise) {
    storePromise = createStore();
  }

  return storePromise;
}

export async function getLessonItems(includeInactive = true): Promise<LessonItem[]> {
  return (await getStore()).getLessonItems(includeInactive);
}

export async function getLessonItemById(id: number): Promise<LessonItem> {
  return (await getStore()).getLessonItemById(id);
}

export async function createLessonItem(title: string): Promise<LessonItem> {
  return (await getStore()).createLessonItem(title);
}

export async function updateLessonItem(
  id: number,
  data: { title?: string; isActive?: boolean },
): Promise<LessonItem> {
  return (await getStore()).updateLessonItem(id, data);
}

export async function deleteLessonItem(id: number): Promise<void> {
  return (await getStore()).deleteLessonItem(id);
}

export async function reorderLessonItems(ids: number[]): Promise<void> {
  return (await getStore()).reorderLessonItems(ids);
}

export async function getLessonRows(date?: string): Promise<LessonRow[]> {
  return (await getStore()).getLessonRows(date);
}

export async function getLessonRowById(id: number): Promise<LessonRow> {
  return (await getStore()).getLessonRowById(id);
}

export async function createLessonRow(data: {
  lessonDate: string;
  period: number;
  lessonItemId: number;
  note?: string;
}): Promise<LessonRow> {
  return (await getStore()).createLessonRow(data);
}

export async function updateLessonRow(
  id: number,
  data: { lessonDate: string; period: number; lessonItemId: number },
): Promise<LessonRow> {
  return (await getStore()).updateLessonRow(id, data);
}

export async function updateLessonCheck(
  id: number,
  status: LessonStatus,
): Promise<LessonCheck> {
  return (await getStore()).updateLessonCheck(id, status);
}

export async function getLatestProgressByClass(): Promise<LatestProgress[]> {
  return (await getStore()).getLatestProgressByClass();
}
