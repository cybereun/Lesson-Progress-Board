import { AppShell } from "@/components/app-shell";
import { BoardPanel } from "@/components/board-panel";
import { getLessonItems, getLessonRows } from "@/lib/db";

export const dynamic = "force-dynamic";

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export default async function BoardPage() {
  const today = getToday();
  const items = await getLessonItems(false);
  const rows = await getLessonRows();

  return (
    <AppShell
      currentPath="/board"
      title="실행창"
      description="날짜와 수업내용으로 수업행을 만들고, 누적 실행표에서 1반부터 9반까지 O/X를 빠르게 기록합니다."
    >
      <BoardPanel initialItems={items} initialRows={rows} initialDate={today} />
    </AppShell>
  );
}
