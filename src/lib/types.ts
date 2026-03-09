export type LessonStatus = "EMPTY" | "O" | "X";

export type LessonItem = {
  id: number;
  title: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
};

export type LessonCheck = {
  id: number;
  lessonRowId: number;
  classNo: number;
  status: LessonStatus;
  updatedAt: string;
};

export type LessonRow = {
  id: number;
  lessonDate: string;
  period: number;
  note: string | null;
  createdAt: string;
  lessonItemId: number;
  lessonItemTitle: string;
  checks: LessonCheck[];
};

export type LatestProgress = {
  classNo: number;
  status: LessonStatus | null;
  lessonDate: string | null;
  period: number | null;
  lessonItemTitle: string | null;
};
