import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireSession } from "@/lib/session";
import { ApplicantModel } from "@/models/Applicant";
import { JobModel } from "@/models/Job";
import { buildApplicantDocuments } from "@/src/services/applicantImportService";
import { parseResumePdf } from "@/src/services/pdfResumeParser";

async function findAuthorizedJob(jobId: string, userId: string) {
  await connectToDatabase();
  try {
    let job = await JobModel.findById(jobId).lean();
    if (!job && Types.ObjectId.isValid(jobId)) {
      job = await JobModel.findById(new Types.ObjectId(jobId)).lean();
    }

    if (!job) return null;

    const jobOwner = job.createdBy instanceof Types.ObjectId ? job.createdBy.toHexString() : String(job.createdBy);
    const requester = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId).toHexString() : userId;

    return jobOwner === requester ? job : null;
  } catch (error) {
    if (error instanceof Error && (error as { name?: string }).name === "CastError") {
      return null;
    }
    throw error;
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSession();
  if (auth.response || !auth.session) return auth.response;

  const { id } = await context.params;

  const job = await findAuthorizedJob(id, auth.session.sub);
  if (!job) {
    return NextResponse.json({ success: false, error: "Job not found." }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: "PDF file is required." }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ success: false, error: "Only PDF resumes are supported." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const { applicant, aiModelVersion, rawResponse } = await parseResumePdf(buffer);
    const document = buildApplicantDocuments(id, [{ ...applicant, source: applicant.source ?? job.source }])[0];
    document.rawResumeText = applicant.rawResumeText ?? rawResponse;

    const result = await ApplicantModel.updateOne(
      { jobId: id, email: document.email },
      { $set: document },
      { upsert: true },
    );

    return NextResponse.json({
      success: true,
      data: {
        upserted: result.upsertedCount ?? 0,
        updated: result.modifiedCount ?? 0,
        aiModelVersion,
        applicant: {
          firstName: document.firstName,
          lastName: document.lastName,
          email: document.email,
          headline: document.headline,
          location: document.location,
          skills: document.skills,
          experience: document.experience,
          education: document.education,
          projects: document.projects,
          availability: document.availability,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to parse resume.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
