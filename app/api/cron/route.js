import { updateAllUsersRating } from "@/actions/updateAllUserRating";
import { NextResponse } from "next/server";

export async function GET(request) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await updateAllUsersRating();
  return NextResponse.json({ ok: true, message: "Users rating updated" });
}
