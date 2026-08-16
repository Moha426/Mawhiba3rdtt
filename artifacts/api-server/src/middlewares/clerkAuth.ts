import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, studentsTable } from "@workspace/db";
import type { Request } from "express";

export async function getStudentFromRequest(req: Request): Promise<number | null> {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  if (!clerkUserId) return null;

  const student = await db
    .select({ id: studentsTable.id })
    .from(studentsTable)
    .where(eq(studentsTable.clerkUserId, clerkUserId))
    .then((r) => r[0]);

  return student?.id ?? null;
}
