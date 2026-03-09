"use client";

import { useState, useTransition } from "react";
import type { LessonItem } from "@/lib/types";

type AdminPanelProps = {
  initialItems: LessonItem[];
};

export function AdminPanel({ initialItems }: AdminPanelProps) {
  const [items, setItems] = useState(initialItems);
  const [newTitle, setNewTitle] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleAddItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = newTitle.trim();

    if (!title) {
      setMessage("수업내용을 먼저 입력해 주세요.");
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/lesson-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "항목 추가에 실패했습니다.");
        return;
      }

      setItems((current) => [...current, payload.item]);
      setNewTitle("");
      setMessage("수업내용을 추가했습니다.");
    });
  }

  async function saveItem(id: number, patch: { title?: string; isActive?: boolean }) {
    setMessage(null);

    const response = await fetch(`/api/lesson-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });

    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error ?? "항목 저장에 실패했습니다.");
      return;
    }

    setItems((current) =>
      current.map((item) => (item.id === id ? payload.item : item)),
    );
    setMessage("항목을 저장했습니다.");
  }

  async function deleteItem(id: number, title: string) {
    const confirmed = window.confirm(`"${title}" 항목을 삭제하시겠습니까?`);

    if (!confirmed) {
      return;
    }

    setMessage(null);

    const response = await fetch(`/api/lesson-items/${id}`, {
      method: "DELETE",
    });

    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error ?? "항목 삭제에 실패했습니다.");
      return;
    }

    setItems(payload.items);
    setMessage("항목을 삭제했습니다.");
  }

  async function moveItem(id: number, direction: "up" | "down") {
    const currentIndex = items.findIndex((item) => item.id === id);
    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= items.length) {
      return;
    }

    const previous = items;
    const reordered = [...items];
    const [target] = reordered.splice(currentIndex, 1);
    reordered.splice(nextIndex, 0, target);
    const normalized = reordered.map((item, index) => ({
      ...item,
      sortOrder: index + 1,
    }));

    setItems(normalized);
    setMessage(null);

    const response = await fetch("/api/lesson-items/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: normalized.map((item) => item.id) }),
    });

    if (!response.ok) {
      const payload = await response.json();
      setMessage(payload.error ?? "정렬 저장에 실패했습니다.");
      setItems(previous);
      return;
    }

    setMessage("순서를 저장했습니다.");
  }

  return (
    <div className="card-grid">
      <section className="panel p-6">
        <div className="mb-5 space-y-2">
          <h2 className="text-xl font-bold text-[var(--foreground)]">수업내용 등록</h2>
          <p className="text-sm leading-6 text-[var(--muted)]">
            단원명이나 수업내용을 한 줄씩 등록하면 실행창 드롭다운에 바로 반영됩니다.
          </p>
        </div>
        <form className="flex flex-col gap-3 md:flex-row" onSubmit={handleAddItem}>
          <input
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder="예: 중화반응"
            className="min-w-0 flex-1 rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-2xl bg-[var(--accent)] px-5 py-3 font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? "추가 중..." : "항목 추가"}
          </button>
        </form>
        <div className="mt-4 rounded-2xl border border-dashed border-[var(--line)] bg-[rgba(255,255,255,0.55)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
          기록이 없는 항목만 삭제할 수 있습니다. 이미 수업 기록에 사용된 항목은 비활성화를 사용해 주세요.
        </div>
        {message ? (
          <p className="mt-4 text-sm font-medium text-[var(--foreground)]">{message}</p>
        ) : null}
      </section>

      <section className="panel p-6">
        <div className="mb-5 space-y-2">
          <h2 className="text-xl font-bold text-[var(--foreground)]">등록 목록</h2>
          <p className="text-sm leading-6 text-[var(--muted)]">
            이름 수정, 순서 변경, 비활성화, 삭제를 이 화면에서 처리합니다.
          </p>
        </div>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="rounded-3xl border border-[var(--line)] bg-[rgba(255,255,255,0.75)] p-4"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[var(--surface-strong)] px-3 py-1 text-xs font-semibold text-[var(--foreground)]">
                  {index + 1}번
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    item.isActive
                      ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "bg-[var(--danger-soft)] text-[var(--danger)]"
                  }`}
                >
                  {item.isActive ? "사용 중" : "비활성화"}
                </span>
              </div>
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <input
                  value={item.title}
                  onChange={(event) => {
                    const value = event.target.value;
                    setItems((current) =>
                      current.map((currentItem) =>
                        currentItem.id === item.id
                          ? { ...currentItem, title: value }
                          : currentItem,
                      ),
                    );
                  }}
                  className="min-w-0 flex-1 rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => moveItem(item.id, "up")}
                    className="rounded-2xl border border-[var(--line)] px-4 py-3 text-sm font-semibold hover:border-[var(--line-strong)]"
                  >
                    위로
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(item.id, "down")}
                    className="rounded-2xl border border-[var(--line)] px-4 py-3 text-sm font-semibold hover:border-[var(--line-strong)]"
                  >
                    아래로
                  </button>
                  <button
                    type="button"
                    onClick={() => saveItem(item.id, { title: item.title })}
                    className="rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white hover:brightness-95"
                  >
                    저장
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      saveItem(item.id, {
                        isActive: !item.isActive,
                      })
                    }
                    className="rounded-2xl border border-[var(--line)] px-4 py-3 text-sm font-semibold hover:border-[var(--line-strong)]"
                  >
                    {item.isActive ? "비활성화" : "다시 사용"}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteItem(item.id, item.title)}
                    className="rounded-2xl border border-[var(--danger)] px-4 py-3 text-sm font-semibold text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
