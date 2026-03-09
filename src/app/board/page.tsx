import { AppShell } from "@/components/app-shell";
import { BoardPanel } from "@/components/board-panel";
import { getLessonItems, getLessonRows } from "@/lib/db";

export const dynamic = "force-dynamic";

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export default function BoardPage() {
  const today = getToday();
  const items = getLessonItems(false);
  const rows = getLessonRows(today);

  return (
    <AppShell
      currentPath="/board"
      title="실행창"
      description="날짜와 교시 기준으로 수업행을 만들고 1반부터 9반까지 O/X를 빠르게 기록합니다."
    >
      <BoardPanel initialItems={items} initialRows={rows} initialDate={today} />
    </AppShell>
  );
}
