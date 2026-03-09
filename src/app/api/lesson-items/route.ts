import { NextResponse } from "next/server";
import { createLessonItem, getLessonItems } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get("includeInactive") !== "false";

  return NextResponse.json({
    items: await getLessonItems(includeInactive),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const item = await createLessonItem(body.title ?? "");
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "수업내용 추가에 실패했습니다.",
      },
      { status: 400 },
    );
  }
}
