import { NextResponse } from "next/server";
import { updateLessonCheck } from "@/lib/db";
import type { LessonStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const check = updateLessonCheck(Number(id), body.status as LessonStatus);

    return NextResponse.json({ check });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "상태 저장에 실패했습니다.",
      },
      { status: 400 },
    );
  }
}
