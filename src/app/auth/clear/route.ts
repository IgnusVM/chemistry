import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/session";
import { appUrl } from "@/lib/app-url";

export async function GET() {
  await deleteSession();
  return NextResponse.redirect(appUrl("/login"));
}
