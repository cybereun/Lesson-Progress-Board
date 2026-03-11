"use client";

import { useState } from "react";
import { CLASS_NUMBERS } from "@/lib/constants";
import type { LessonItem, LessonRow, LessonStatus } from "@/lib/types";

type BoardPanelProps = {
  initialItems: LessonItem[];
  initialRows: LessonRow[];
  initialDate: string;
};

type EditDraft = {
  lessonDate: string;
  lessonItemId: number;
  note: string;
};

const nextStatusMap: Record<LessonStatus, LessonStatus> = {
  EMPTY: "O",
  O: "X",
  X: "EMPTY",
};

function sortRows(rows: LessonRow[]) {
  return [...rows].sort((a, b) => {
    if (a.lessonDate !== b.lessonDate) {
      return a.lessonDate < b.lessonDate ? 1 : -1;
    }

    return b.id - a.id;
  });
}

export function BoardPanel({
  initialItems,
  initialRows,
  initialDate,
}: BoardPanelProps) {
  const [items] = useState(initialItems);
  const [rows, setRows] = useState(sortRows(initialRows));
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedLessonItemId, setSelectedLessonItemId] = useState(
    initialItems[0]?.id ?? 0,
  );
  const [note, setNote] = useState("");
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleCreateRow(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const response = await fetch("/api/lesson-rows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lessonDate: selectedDate,
        period: 1,
        lessonItemId: selectedLessonItemId,
        note,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error ?? "수업행 생성에 실패했습니다.");
      return;
    }

    setRows((current) => sortRows([payload.row, ...current]));
    setNote("");
    setMessage("수업행을 추가했습니다.");
  }

  function startEditing(row: LessonRow) {
    setEditingRowId(row.id);
    setEditDraft({
      lessonDate: row.lessonDate,
      lessonItemId: row.lessonItemId,
      note: row.note ?? "",
    });
    setMessage(null);
  }

  function cancelEditing() {
    setEditingRowId(null);
    setEditDraft(null);
    setMessage(null);
  }

  async function saveRow(rowId: number) {
    if (!editDraft) {
      return;
    }

    const currentRow = rows.find((row) => row.id === rowId);
    const response = await fetch(`/api/lesson-rows/${rowId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editDraft,
        period: currentRow?.period ?? 1,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error ?? "수업행 수정에 실패했습니다.");
      return;
    }

    setRows((current) =>
      sortRows([
        payload.row,
        ...current.filter((row) => row.id !== rowId),
      ]),
    );

    setEditingRowId(null);
    setEditDraft(null);
    setMessage("수업행 정보를 수정했습니다.");
  }

  async function cycleCheck(rowId: number, classNo: number) {
    const targetRow = rows.find((row) => row.id === rowId);
    const targetCheck = targetRow?.checks.find((check) => check.classNo === classNo);

    if (!targetCheck) {
      return;
    }

    const nextStatus = nextStatusMap[targetCheck.status];

    setRows((current) =>
      current.map((row) =>
        row.id === rowId
          ? {
              ...row,
              checks: row.checks.map((check) =>
                check.id === targetCheck.id ? { ...check, status: nextStatus } : check,
              ),
            }
          : row,
      ),
    );

    const response = await fetch(`/api/lesson-checks/${targetCheck.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setRows((current) =>
        current.map((row) =>
          row.id === rowId
            ? {
                ...row,
                checks: row.checks.map((check) =>
                  check.id === targetCheck.id
                    ? { ...check, status: targetCheck.status }
                    : check,
                ),
              }
            : row,
        ),
      );
      setMessage(payload.error ?? "상태 저장에 실패했습니다.");
      return;
    }

    setRows((current) =>
      current.map((row) =>
        row.id === rowId
          ? {
              ...row,
              checks: row.checks.map((check) =>
                check.id === targetCheck.id ? payload.check : check,
              ),
            }
          : row,
      ),
    );
  }

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="mb-5 space-y-2">
          <h2 className="text-xl font-bold">새 수업행 추가</h2>
          <p className="text-sm leading-6 text-[var(--muted)]">
            날짜와 수업내용을 정해 한 줄을 만들면 기존 실행표는 그대로 유지되고,
            새 행만 계속 누적됩니다.
          </p>
        </div>
        <form
          className="grid gap-3 md:grid-cols-[1fr_1.5fr_1fr_auto]"
          onSubmit={handleCreateRow}
        >
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
          />
          <select
            value={selectedLessonItemId}
            onChange={(event) => setSelectedLessonItemId(Number(event.target.value))}
            className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
          >
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="메모(선택)"
            className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            disabled={!selectedLessonItemId}
            className="rounded-2xl bg-[var(--accent)] px-5 py-3 font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            행 추가
          </button>
        </form>
        <p className="mt-3 text-xs text-[var(--muted)]">
          날짜 입력은 새로 추가하는 행에만 적용됩니다. 아래 실행표는 날짜를 바꿔도 유지됩니다.
        </p>
        {message ? (
          <p className="mt-4 text-sm font-medium text-[var(--foreground)]">{message}</p>
        ) : null}
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4">
          <div>
            <h2 className="text-xl font-bold">누적 실행표</h2>
            <p className="text-sm text-[var(--muted)]">
              상태 버튼을 누르면 빈칸, O, X 순서로 즉시 변경됩니다.
            </p>
          </div>
          <div className="rounded-full bg-[var(--surface-strong)] px-4 py-2 text-sm font-semibold text-[var(--foreground)]">
            {rows.length}개 수업행
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-[rgba(255,255,255,0.7)]">
                <th className="border-b border-[var(--line)] px-4 py-4 text-left text-sm font-semibold">
                  날짜
                </th>
                <th className="border-b border-[var(--line)] px-4 py-4 text-left text-sm font-semibold">
                  수업내용
                </th>
                <th className="border-b border-[var(--line)] px-4 py-4 text-left text-sm font-semibold">
                  메모
                </th>
                <th className="border-b border-[var(--line)] px-4 py-4 text-left text-sm font-semibold">
                  관리
                </th>
                {CLASS_NUMBERS.map((classNo) => (
                  <th
                    key={classNo}
                    className="border-b border-[var(--line)] px-3 py-4 text-center text-sm font-semibold"
                  >
                    {classNo}반
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isEditing = editingRowId === row.id && editDraft;

                return (
                  <tr key={row.id} className="odd:bg-[rgba(255,255,255,0.45)]">
                    <td className="border-b border-[var(--line)] px-4 py-3 text-sm">
                      {isEditing ? (
                        <input
                          type="date"
                          value={editDraft.lessonDate}
                          onChange={(event) =>
                            setEditDraft((current) =>
                              current
                                ? { ...current, lessonDate: event.target.value }
                                : current,
                            )
                          }
                          className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 outline-none transition focus:border-[var(--accent)]"
                        />
                      ) : (
                        row.lessonDate
                      )}
                    </td>
                    <td className="border-b border-[var(--line)] px-4 py-3">
                      {isEditing ? (
                        <select
                          value={editDraft.lessonItemId}
                          onChange={(event) =>
                            setEditDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    lessonItemId: Number(event.target.value),
                                  }
                                : current,
                            )
                          }
                          className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 outline-none transition focus:border-[var(--accent)]"
                        >
                          {items.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.title}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="font-semibold">{row.lessonItemTitle}</div>
                      )}
                    </td>
                    <td className="border-b border-[var(--line)] px-4 py-3 text-sm text-[var(--muted)]">
                      {isEditing ? (
                        <input
                          value={editDraft.note}
                          onChange={(event) =>
                            setEditDraft((current) =>
                              current ? { ...current, note: event.target.value } : current,
                            )
                          }
                          placeholder="메모(선택)"
                          className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 outline-none transition focus:border-[var(--accent)]"
                        />
                      ) : row.note ? (
                        row.note
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="border-b border-[var(--line)] px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => saveRow(row.id)}
                              className="rounded-xl bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white"
                            >
                              저장
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditing}
                              className="rounded-xl border border-[var(--line)] px-3 py-2 text-xs font-semibold"
                            >
                              취소
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditing(row)}
                            className="rounded-xl border border-[var(--line)] px-3 py-2 text-xs font-semibold hover:border-[var(--line-strong)]"
                          >
                            수정
                          </button>
                        )}
                      </div>
                    </td>
                    {CLASS_NUMBERS.map((classNo) => {
                      const check = row.checks.find((current) => current.classNo === classNo);

                      return (
                        <td
                          key={`${row.id}-${classNo}`}
                          className="border-b border-[var(--line)] px-2 py-3 text-center"
                        >
                          <button
                            type="button"
                            onClick={() => cycleCheck(row.id, classNo)}
                            className={`h-11 w-11 rounded-2xl border text-sm font-bold transition ${
                              check?.status === "O"
                                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                                : check?.status === "X"
                                  ? "border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]"
                                  : "border-[var(--line)] bg-[var(--empty)] text-[var(--muted)]"
                            }`}
                          >
                            {check?.status === "EMPTY" ? "" : check?.status}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm leading-6 text-[var(--muted)]">
              등록된 수업행이 없습니다.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
