import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireSession } from "@/lib/session";
import { JobModel } from "@/models/Job";
import { ScreeningModel } from "@/models/Screening";

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

  let jobObjectId: Types.ObjectId;
  try {
    jobObjectId = new Types.ObjectId(normalizedId);
  } catch {
    return NextResponse.json({ success: false, error: "Invalid job id." }, { status: 400 });
  }

  await connectToDatabase();

  try {
    // Only allow recruiters to read screenings for their own roles.
    const job = await JobModel.findOne({ _id: jobObjectId, createdBy: auth.session.sub })
      .select({ _id: 1, createdBy: 1 })
      .lean();

    if (!job) {
      return NextResponse.json({ success: false, error: "Job not found." }, { status: 404 });
    }

    // createdBy is present because we filtered above; double-check remains for extra safety.
    if (job.createdBy && String(job.createdBy) !== auth.session.sub) {
      return NextResponse.json({ success: false, error: "Not authorised to view screenings for this job." }, { status: 403 });
    }

    const screenings = await ScreeningModel.find({ jobId: jobObjectId })
      .sort({ createdAt: -1 })
      .select({
        jobId: 1,
        status: 1,
        totalApplicants: 1,
        shortlistSize: 1,
        processingTimeMs: 1,
        createdAt: 1,
        aiModelVersion: 1,
        promptVersion: 1,
        error: 1,
        errorMessage: 1,
      })
      .lean();

    return NextResponse.json({
      success: true,
      data: screenings.map((screening) => ({
        id: String(screening._id),
        status: screening.status,
        totalApplicants: screening.totalApplicants,
        shortlistSize: screening.shortlistSize,
        processingTimeMs: screening.processingTimeMs,
        createdAt: screening.createdAt,
        aiModelVersion: screening.aiModelVersion,
        promptVersion: screening.promptVersion,
        error: screening.error,
        errorMessage: screening.errorMessage,
      })),
    });
  } catch (error) {
    console.error("Failed to load job screenings", error);
    const message = error instanceof Error ? error.message : "Unable to load screenings.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
