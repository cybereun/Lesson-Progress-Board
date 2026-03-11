import { AppShell } from "@/components/app-shell";
import { getLatestProgressByClass } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const progressItems = await getLatestProgressByClass();

  return (
    <AppShell
      currentPath="/progress"
      title="반별 최근 진도"
      description="각 반이 마지막으로 기록한 수업내용과 상태를 한 번에 확인합니다."
    >
      <section className="panel p-6">
        <div className="mb-5 space-y-2">
          <h2 className="text-xl font-bold">최근 기록</h2>
          <p className="text-sm leading-6 text-[var(--muted)]">
            상태가 O 또는 X로 기록된 가장 최근 수업행을 반별로 보여줍니다.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {progressItems.map((item) => (
            <article
              key={item.classNo}
              className="rounded-3xl border border-[var(--line)] bg-[rgba(255,255,255,0.78)] p-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">{item.classNo}반</h3>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    item.status === "O"
                      ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                      : item.status === "X"
                        ? "bg-[var(--danger-soft)] text-[var(--danger)]"
                        : "bg-[var(--empty)] text-[var(--muted)]"
                  }`}
                >
                  {item.status ?? "기록 없음"}
                </span>
              </div>
              <div className="mt-4 space-y-2 text-sm leading-6 text-[var(--muted)]">
                <p>날짜: {item.lessonDate ?? "-"}</p>
                <p>수업내용: {item.lessonItemTitle ?? "-"}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
