import { NextResponse } from "next/server";
import { createLessonRow, getLessonRows } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? undefined;

  return NextResponse.json({
    rows: getLessonRows(date),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const row = createLessonRow({
      lessonDate: body.lessonDate ?? "",
      period: Number(body.period),
      lessonItemId: Number(body.lessonItemId),
      note: body.note,
    });

    return NextResponse.json({ row }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "수업행 생성에 실패했습니다.",
      },
      { status: 400 },
    );
  }
}
