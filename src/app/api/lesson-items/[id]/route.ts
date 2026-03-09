import { NextResponse } from "next/server";
import { deleteLessonItem, getLessonItems, updateLessonItem } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const item = await updateLessonItem(Number(id), {
      title: body.title,
      isActive: body.isActive,
    });

    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "수업내용 저장에 실패했습니다.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    await deleteLessonItem(Number(id));

    return NextResponse.json({
      items: await getLessonItems(true),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "수업내용 삭제에 실패했습니다.",
      },
      { status: 400 },
    );
  }
}
