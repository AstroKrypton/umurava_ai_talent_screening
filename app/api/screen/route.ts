import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireSession } from "@/lib/session";
import { JobModel } from "@/models/Job";
import { ApplicantModel } from "@/models/Applicant";
import { ScreeningModel } from "@/models/Screening";

export async function POST(request: Request) {
  const auth = await requireSession();
  if (auth.response || !auth.session) return auth.response;

  let jobId: string | undefined;
  try {
    const body = (await request.json()) as { jobId?: string };
    jobId = body?.jobId?.trim();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request payload." }, { status: 400 });
  }

  if (!jobId || !Types.ObjectId.isValid(jobId)) {
    return NextResponse.json({ success: false, error: "Invalid job id." }, { status: 400 });
  }

  await connectToDatabase();

  const job = await JobModel.findOne({ _id: jobId, createdBy: auth.session.sub }).lean();
  if (!job) {
    return NextResponse.json({ success: false, error: "Job not found." }, { status: 404 });
  }

  const existingScreening = await ScreeningModel.findOne({
    jobId,
    status: { $in: ["pending", "processing"] },
  }).lean();
  if (existingScreening) {
    return NextResponse.json(
      { success: false, error: "A screening is already in progress for this job." },
      { status: 409 },
    );
  }

  const applicantCount = await ApplicantModel.countDocuments({ jobId });
  if (applicantCount === 0) {
    return NextResponse.json({ success: false, error: "Add applicants before running a screening." }, { status: 400 });
  }

  const screening = await ScreeningModel.create({
    jobId,
    triggeredBy: auth.session.sub,
    status: "processing",
    totalApplicants: applicantCount,
    shortlistSize: job.shortlistSize ?? 10,
    results: [],
  });

  const executeUrl = new URL("/api/screen/execute", request.url);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const cookie = request.headers.get("cookie");
  if (cookie) {
    headers.Cookie = cookie;
  }

  void fetch(executeUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ screeningId: String(screening._id) }),
  }).catch((error) => {
    console.error("Failed to trigger screening execution", error);
  });

  return NextResponse.json(
    {
      success: true,
      data: {
        id: String(screening._id),
        status: screening.status,
        createdAt: screening.createdAt,
      },
    },
    { status: 202 },
  );
}
