import { AppShell } from "@/components/app-shell";
import { AdminPanel } from "@/components/admin-panel";
import { getLessonItems } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  const items = getLessonItems(true);

  return (
    <AppShell
      currentPath="/admin"
      title="관리창"
      description="수업내용 원본 목록을 등록, 수정, 비활성화하고 드롭다운 순서를 관리합니다."
      titleIcon={
        <svg
          aria-hidden="true"
          viewBox="0 0 48 48"
          className="h-7 w-7"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="9" y="7" width="30" height="34" rx="8" fill="currentColor" opacity="0.12" />
          <rect x="13" y="11" width="22" height="6" rx="3" fill="currentColor" />
          <rect x="15" y="22" width="6" height="6" rx="2" fill="currentColor" opacity="0.28" />
          <path
            d="M16.5 25.1L18.5 27.1L21.8 23.4"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x="25" y="22.5" width="8" height="2.8" rx="1.4" fill="currentColor" opacity="0.7" />
          <rect x="25" y="27" width="6" height="2.8" rx="1.4" fill="currentColor" opacity="0.38" />
          <rect x="15" y="31" width="6" height="6" rx="2" fill="currentColor" opacity="0.2" />
          <path
            d="M16.9 34L19 36L21.2 33.7"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x="25" y="31.5" width="8" height="2.8" rx="1.4" fill="currentColor" opacity="0.7" />
          <rect x="25" y="36" width="6" height="2.8" rx="1.4" fill="currentColor" opacity="0.38" />
        </svg>
      }
    >
      <AdminPanel initialItems={items} />
    </AppShell>
  );
}
