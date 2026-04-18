import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireSession } from "@/lib/session";
import { ScreeningModel } from "@/models/Screening";
import { JobModel } from "@/models/Job";

type ParamsOrPromise<T> = T | Promise<T>;

async function resolveParams<T>(maybeParams: ParamsOrPromise<T>): Promise<T> {
  return Promise.resolve(maybeParams);
}

export async function GET(
  _request: Request,
  context: { params: ParamsOrPromise<{ id: string }> },
) {
  const auth = await requireSession();
  if (auth.response || !auth.session) return auth.response;

  const { id } = await resolveParams(context.params);
  const normalizedId = id.trim();

  let screeningObjectId: Types.ObjectId;
  try {
    screeningObjectId = new Types.ObjectId(normalizedId);
  } catch {
    return NextResponse.json({ success: false, error: "Invalid screening id." }, { status: 400 });
  }

  await connectToDatabase();

  try {
    const screening = await ScreeningModel.findById(screeningObjectId).lean();
    if (!screening) {
      return NextResponse.json({ success: false, error: "Screening not found." }, { status: 404 });
    }

    const job = await JobModel.findOne({ _id: screening.jobId, createdBy: auth.session.sub }).lean();
    if (!job) {
      return NextResponse.json({ success: false, error: "Screening not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: String(screening._id),
        jobId: String(screening.jobId),
        status: screening.status,
        totalApplicants: screening.totalApplicants,
        shortlistSize: screening.shortlistSize,
        results: screening.results,
        processingTimeMs: screening.processingTimeMs,
        createdAt: screening.createdAt,
        promptVersion: screening.promptVersion,
        aiModelVersion: screening.aiModelVersion,
        errorMessage: screening.errorMessage,
      },
    });
  } catch (error) {
    console.error("Failed to load screening detail", error);
    const message = error instanceof Error ? error.message : "Unable to load screening.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
