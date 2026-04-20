import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireSession } from "@/lib/session";
import { ApplicantModel } from "@/models/Applicant";
import { JobModel } from "@/models/Job";
import { buildApplicantDocuments, parseApplicantsCsv, type CsvFieldMapping } from "@/src/services/applicantImportService";
import type { TalentProfile } from "@/src/types/talent";

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
  const mappingRaw = formData.get("mapping");
  const defaultSource = (formData.get("source") as TalentProfile["source"]) ?? job.source ?? "external";

  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: "CSV file is required." }, { status: 400 });
  }

  let mapping: CsvFieldMapping | undefined;
  if (typeof mappingRaw === "string" && mappingRaw.trim().length > 0) {
    try {
      mapping = JSON.parse(mappingRaw) as CsvFieldMapping;
    } catch (error) {
      return NextResponse.json({ success: false, error: "Invalid mapping payload." }, { status: 400 });
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const { applicants, warnings } = parseApplicantsCsv(buffer, {
    mapping,
    defaultSource,
  });

  const previewApplicant = applicants.find((applicant) => {
    const fullName = `${applicant.firstName} ${applicant.lastName}`.trim().toLowerCase();
    return fullName === "bertin nshuti";
  });

  if (previewApplicant) {
    console.log("CSV import preview for Bertin Nshuti:", JSON.stringify(previewApplicant, null, 2));
  }

  if (applicants.length === 0) {
    const message = warnings.length > 0 ? warnings[0].message : "No valid applicants found in CSV.";
    return NextResponse.json({ success: false, error: message, warnings }, { status: 400 });
  }

  const documents = buildApplicantDocuments(id, applicants);

  try {
    const result = await ApplicantModel.bulkWrite(
      documents.map((doc) => ({
        updateOne: {
          filter: { jobId: id, email: doc.email },
          update: { $set: doc },
          upsert: true,
        },
      })),
      { ordered: false },
    );

    const inserted = result.upsertedCount ?? 0;
    const modified = result.modifiedCount ?? 0;
    const matched = result.matchedCount ?? 0;
    const rawUpdated = modified + matched - inserted;
    const updated = Math.max(rawUpdated, 0);

    return NextResponse.json({
      success: true,
      data: {
        inserted,
        updated,
        totalProcessed: documents.length,
        warnings,
        previewApplicant,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to import applicants.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
