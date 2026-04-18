import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireSession } from "@/lib/session";
import { ApplicantModel } from "@/models/Applicant";
import { JobModel } from "@/models/Job";

function isValidObjectId(value: string) {
  return Types.ObjectId.isValid(value);
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/jobs/[id]/applicants/[applicantId]">,
) {
  const auth = await requireSession();
  if (auth.response || !auth.session) return auth.response;

  const { id, applicantId } = await context.params;
  if (!isValidObjectId(id) || !isValidObjectId(applicantId)) {
    return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
  }

  await connectToDatabase();

  const job = await JobModel.findOne({ _id: id, createdBy: auth.session.sub }).lean();
  if (!job) {
    return NextResponse.json({ success: false, error: "Job not found." }, { status: 404 });
  }

  const applicant = await ApplicantModel.findOneAndDelete({ _id: applicantId, jobId: id }).lean();
  if (!applicant) {
    return NextResponse.json({ success: false, error: "Applicant not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: { id: String(applicant._id) } });
}
