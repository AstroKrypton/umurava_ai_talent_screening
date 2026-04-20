import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireSession } from "@/lib/session";
import { ScreeningModel } from "@/models/Screening";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSession();
  if (auth.response || !auth.session) return auth.response;

  const { id } = await context.params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, error: "Invalid screening id." }, { status: 400 });
  }

  await connectToDatabase();

  const screening = await ScreeningModel.findOne({ _id: id, triggeredBy: auth.session.sub }).lean();
  if (!screening) {
    return NextResponse.json({ success: false, error: "Screening not found." }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      id: String(screening._id),
      status: screening.status,
      totalApplicants: screening.totalApplicants,
      shortlistSize: screening.shortlistSize,
      processingTimeMs: screening.processingTimeMs,
      aiModelVersion: screening.aiModelVersion,
      promptVersion: screening.promptVersion,
      usedFallback: screening.usedFallback ?? false,
      error: screening.error,
      results: screening.results,
      createdAt: screening.createdAt,
      updatedAt: screening.updatedAt,
    },
  });
}
