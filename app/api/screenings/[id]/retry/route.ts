import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireSession } from "@/lib/session";
import { ApplicantModel } from "@/models/Applicant";
import { JobModel } from "@/models/Job";
import { ScreeningModel } from "@/models/Screening";
import { executeScreening } from "@/src/services/geminiScreeningService";
import { toApplicantsForScreening, toJobForScreening } from "@/src/services/screeningService";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSession();
  if (auth.response || !auth.session) return auth.response;

  const { id } = await context.params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, error: "Invalid screening id." }, { status: 400 });
  }

  await connectToDatabase();
  const screening = await ScreeningModel.findById(id);
  if (!screening) {
    return NextResponse.json({ success: false, error: "Screening not found." }, { status: 404 });
  }

  const job = await JobModel.findOne({ _id: screening.jobId, createdBy: auth.session.sub }).lean();
  if (!job) {
    return NextResponse.json({ success: false, error: "Screening not found." }, { status: 404 });
  }

  const applicants = await ApplicantModel.find({ jobId: screening.jobId }).lean();
  if (applicants.length === 0) {
    return NextResponse.json({ success: false, error: "Add applicants before running a screening." }, { status: 400 });
  }

  const jobPayload = toJobForScreening(job);
  const applicantPayload = toApplicantsForScreening(applicants);

  screening.status = "processing";
  screening.totalApplicants = applicantPayload.length;
  screening.shortlistSize = jobPayload.shortlistSize;
  screening.results = [];
  await screening.save();

  const execution = await executeScreening(jobPayload, applicantPayload);

  screening.status = "completed";
  screening.results = execution.results;
  screening.processingTimeMs = execution.processingTimeMs;
  screening.aiModelVersion = execution.aiModelVersion;
  screening.promptVersion = execution.promptVersion;
  screening.errorMessage = execution.usedFallback ? execution.errorMessage : undefined;
  await screening.save();

  return NextResponse.json({
    success: true,
    data: {
      id: String(screening._id),
      status: screening.status,
      results: screening.results,
      processingTimeMs: screening.processingTimeMs,
      updatedAt: screening.updatedAt,
      aiModelVersion: screening.aiModelVersion,
      promptVersion: screening.promptVersion,
      usedFallback: execution.usedFallback,
      errorMessage: screening.errorMessage,
    },
  });
}
