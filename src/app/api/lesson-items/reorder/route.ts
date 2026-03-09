import { NextResponse } from "next/server";
import { getLessonItems, reorderLessonItems } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    reorderLessonItems(body.ids ?? []);

    return NextResponse.json({
      items: getLessonItems(true),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "정렬 저장에 실패했습니다.",
      },
      { status: 400 },
    );
  }
}
