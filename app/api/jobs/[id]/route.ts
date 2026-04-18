import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireSession } from "@/lib/session";
import { JobModel } from "@/models/Job";
import { serializeJob } from "@/lib/jobs-service";
import { jobUpdateSchema } from "@/lib/jobs-validation";
import { revalidateJobsListing } from "@/lib/jobs-cache";

function isValidObjectId(value: string) {
  return Types.ObjectId.isValid(value);
}

export async function GET(_request: Request, context: RouteContext<"/api/jobs/[id]">) {
  const auth = await requireSession();
  if (auth.response || !auth.session) return auth.response;

  const { id } = await context.params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ success: false, error: "Invalid job id." }, { status: 400 });
  }

  await connectToDatabase();
  const job = await JobModel.findOne({ _id: id, createdBy: auth.session.sub }).lean();

  if (!job) {
    return NextResponse.json({ success: false, error: "Job not found." }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: serializeJob(job),
  });
}

export async function PATCH(request: Request, context: RouteContext<"/api/jobs/[id]">) {
  const auth = await requireSession();
  if (auth.response || !auth.session) return auth.response;

  const { id } = await context.params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ success: false, error: "Invalid job id." }, { status: 400 });
  }

  const json = await request.json();
  const parsedBody = jobUpdateSchema.safeParse(json);

  if (!parsedBody.success) {
    return NextResponse.json(
      { success: false, error: "Invalid request payload.", issues: parsedBody.error.flatten() },
      { status: 400 },
    );
  }

  const updates = parsedBody.data;

  await connectToDatabase();
  const job = await JobModel.findOneAndUpdate(
    { _id: id, createdBy: auth.session.sub },
    updates,
    { new: true },
  ).lean();

  if (!job) {
    return NextResponse.json({ success: false, error: "Job not found." }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: serializeJob(job),
  });
}

export async function DELETE(_request: Request, context: RouteContext<"/api/jobs/[id]">) {
  const auth = await requireSession();
  if (auth.response || !auth.session) return auth.response;

  const { id } = await context.params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ success: false, error: "Invalid job id." }, { status: 400 });
  }

  await connectToDatabase();
  const job = await JobModel.findOneAndUpdate(
    { _id: id, createdBy: auth.session.sub },
    { status: "closed" },
    { new: true },
  ).lean();

  if (!job) {
    return NextResponse.json({ success: false, error: "Job not found." }, { status: 404 });
  }

  revalidateJobsListing();

  return NextResponse.json({ success: true, data: { id: String(job._id), status: job.status } });
}
