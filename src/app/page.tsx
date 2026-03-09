import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getLatestProgressByClass, getLessonItems, getLessonRows } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const items = getLessonItems(false);
  const rows = getLessonRows();
  const latest = getLatestProgressByClass();
  const completedCount = latest.filter((item) => item.status === "O").length;

  return (
    <AppShell
      currentPath="/"
      title="수업진도 체크표"
      description="관리창에서 수업내용을 정리하고, 실행창에서 날짜와 교시별로 1반부터 9반까지 진도 여부를 빠르게 체크합니다."
    >
      <div className="card-grid">
        <section className="panel p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl bg-[rgba(255,255,255,0.75)] p-5">
              <div className="text-sm font-semibold text-[var(--muted)]">등록된 항목</div>
              <div className="mt-3 text-4xl font-bold">{items.length}</div>
            </div>
            <div className="rounded-3xl bg-[rgba(255,255,255,0.75)] p-5">
              <div className="text-sm font-semibold text-[var(--muted)]">전체 수업행</div>
              <div className="mt-3 text-4xl font-bold">{rows.length}</div>
            </div>
            <div className="rounded-3xl bg-[rgba(255,255,255,0.75)] p-5">
              <div className="text-sm font-semibold text-[var(--muted)]">최근 O 반 수</div>
              <div className="mt-3 text-4xl font-bold">{completedCount}</div>
            </div>
          </div>
          <div className="mt-6 rounded-3xl border border-[var(--line)] bg-[linear-gradient(135deg,rgba(47,108,79,0.1),rgba(255,255,255,0.8))] p-5">
            <h2 className="text-xl font-bold">사용 흐름</h2>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted)]">
              <li>1. 관리창에서 단원명이나 수업내용을 한 줄씩 등록합니다.</li>
              <li>2. 실행창에서 날짜, 교시, 수업내용을 골라 수업행을 만듭니다.</li>
              <li>3. 각 반의 칸을 눌러 O, X, 빈칸 상태를 즉시 저장합니다.</li>
              <li>4. 최근 진도 화면에서 반별 마지막 진행 상황을 확인합니다.</li>
            </ol>
          </div>
        </section>

        <section className="panel p-6">
          <div className="space-y-3">
            <h2 className="text-xl font-bold">빠른 이동</h2>
            <p className="text-sm leading-6 text-[var(--muted)]">
              실제 사용 빈도가 높은 순서로 바로 이동할 수 있게 구성했습니다.
            </p>
          </div>
          <div className="mt-5 space-y-3">
            {[
              {
                href: "/board",
                title: "실행창 열기",
                description: "수업 직후 날짜, 교시, 내용 기준으로 반별 O/X를 기록합니다.",
              },
              {
                href: "/admin",
                title: "관리창 열기",
                description: "드롭다운에 들어갈 수업내용 목록을 등록하고 정렬합니다.",
              },
              {
                href: "/progress",
                title: "최근 진도 보기",
                description: "1반부터 9반까지 마지막 기록을 한 번에 확인합니다.",
              },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-3xl border border-[var(--line)] bg-[rgba(255,255,255,0.78)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--line-strong)]"
              >
                <div className="text-lg font-bold">{item.title}</div>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {item.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
