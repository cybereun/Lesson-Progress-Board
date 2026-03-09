"use client";

import { useEffect, useState, useTransition } from "react";
import { CLASS_NUMBERS, PERIODS } from "@/lib/constants";
import type { LessonItem, LessonRow, LessonStatus } from "@/lib/types";

type BoardPanelProps = {
  initialItems: LessonItem[];
  initialRows: LessonRow[];
  initialDate: string;
};

type EditDraft = {
  lessonDate: string;
  period: number;
  lessonItemId: number;
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

    if (a.period !== b.period) {
      return a.period - b.period;
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
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  const [selectedLessonItemId, setSelectedLessonItemId] = useState(
    initialItems[0]?.id ?? 0,
  );
  const [note, setNote] = useState("");
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const response = await fetch(`/api/lesson-rows?date=${selectedDate}`, {
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "수업행을 불러오지 못했습니다.");
        return;
      }

      setRows(sortRows(payload.rows));
      setEditingRowId(null);
      setEditDraft(null);
    });
  }, [selectedDate]);

  async function handleCreateRow(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const response = await fetch("/api/lesson-rows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lessonDate: selectedDate,
        period: selectedPeriod,
        lessonItemId: selectedLessonItemId,
        note,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error ?? "수업행 생성에 실패했습니다.");
      return;
    }

    if (payload.row.lessonDate === selectedDate) {
      setRows((current) => sortRows([payload.row, ...current]));
    }
    setNote("");
    setMessage("수업행을 추가했습니다.");
  }

  function startEditing(row: LessonRow) {
    setEditingRowId(row.id);
    setEditDraft({
      lessonDate: row.lessonDate,
      period: row.period,
      lessonItemId: row.lessonItemId,
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

    const response = await fetch(`/api/lesson-rows/${rowId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editDraft),
    });

    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error ?? "수업행 수정에 실패했습니다.");
      return;
    }

    setRows((current) => {
      const filtered = current.filter((row) => row.id !== rowId);

      if (payload.row.lessonDate !== selectedDate) {
        return sortRows(filtered);
      }

      return sortRows([payload.row, ...filtered]);
    });

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
            날짜, 교시, 수업내용을 정한 뒤 한 줄을 만들면 1반부터 9반까지 체크칸이 자동 생성됩니다.
          </p>
        </div>
        <form
          className="grid gap-3 md:grid-cols-[1fr_140px_1.4fr_1fr_auto]"
          onSubmit={handleCreateRow}
        >
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
          />
          <select
            value={selectedPeriod}
            onChange={(event) => setSelectedPeriod(Number(event.target.value))}
            className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
          >
            {PERIODS.map((period) => (
              <option key={period} value={period}>
                {period}교시
              </option>
            ))}
          </select>
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
            disabled={isPending || !selectedLessonItemId}
            className="rounded-2xl bg-[var(--accent)] px-5 py-3 font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            행 추가
          </button>
        </form>
        {message ? (
          <p className="mt-4 text-sm font-medium text-[var(--foreground)]">{message}</p>
        ) : null}
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4">
          <div>
            <h2 className="text-xl font-bold">{selectedDate} 실행표</h2>
            <p className="text-sm text-[var(--muted)]">
              셀을 클릭하면 빈칸 → O → X → 빈칸 순서로 즉시 저장됩니다.
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
                  교시
                </th>
                <th className="border-b border-[var(--line)] px-4 py-4 text-left text-sm font-semibold">
                  수업내용
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
                    <td className="border-b border-[var(--line)] px-4 py-3 text-sm">
                      {isEditing ? (
                        <select
                          value={editDraft.period}
                          onChange={(event) =>
                            setEditDraft((current) =>
                              current
                                ? { ...current, period: Number(event.target.value) }
                                : current,
                            )
                          }
                          className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 outline-none transition focus:border-[var(--accent)]"
                        >
                          {PERIODS.map((period) => (
                            <option key={period} value={period}>
                              {period}교시
                            </option>
                          ))}
                        </select>
                      ) : (
                        `${row.period}교시`
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
                        <>
                          <div className="font-semibold">{row.lessonItemTitle}</div>
                          {row.note ? (
                            <div className="mt-1 text-xs text-[var(--muted)]">{row.note}</div>
                          ) : null}
                        </>
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
              선택한 날짜에 등록된 수업행이 없습니다.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
