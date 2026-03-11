import { NextResponse } from "next/server";
import { updateLessonRow } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const period = Number(body.period ?? 1);
    const row = await updateLessonRow(Number(id), {
      lessonDate: body.lessonDate ?? "",
      period,
      lessonItemId: Number(body.lessonItemId),
      note: body.note,
    });

    return NextResponse.json({ row });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "수업행 수정에 실패했습니다.",
      },
      { status: 400 },
    );
  }
}
