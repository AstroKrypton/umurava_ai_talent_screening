import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { fetchJobsListing, isJobStatus, serializeJob } from "@/lib/jobs-service";
import { revalidateJobsListing } from "@/lib/jobs-cache";
import { connectToDatabase } from "@/lib/mongodb";
import { JobModel } from "@/models/Job";
import { jobCreateSchema, jobQuerySchema } from "@/lib/jobs-validation";

export async function GET(request: Request) {
  const auth = await requireSession();
  if (auth.response || !auth.session) return auth.response;

  const url = new URL(request.url);
  const rawQuery = Object.fromEntries(url.searchParams.entries());
  const parsedQuery = jobQuerySchema.safeParse(rawQuery);

  if (!parsedQuery.success) {
    return NextResponse.json(
      { success: false, error: "Invalid query parameters.", issues: parsedQuery.error.flatten() },
      { status: 400 },
    );
  }

  const { status, search, page, limit } = parsedQuery.data;

  const listing = await fetchJobsListing({
    createdBy: auth.session.sub,
    status,
    search,
    page,
    limit,
  });

  return NextResponse.json({
    success: true,
    data: listing.jobs,
    counts: listing.counts,
    pagination: listing.pagination,
  });
}

export async function POST(request: Request) {
  const auth = await requireSession();
  if (auth.response || !auth.session) return auth.response;

  const json = await request.json();
  const parsedBody = jobCreateSchema.safeParse(json);

  if (!parsedBody.success) {
    return NextResponse.json(
      { success: false, error: "Invalid request payload.", issues: parsedBody.error.flatten() },
      { status: 400 },
    );
  }

  const {
    title,
    description,
    requiredSkills,
    niceToHaveSkills,
    minExperienceYears,
    educationLevel,
    location,
    employmentType,
    shortlistSize,
    status,
    source,
  } = parsedBody.data;

  await connectToDatabase();

  const job = await JobModel.create({
    createdBy: auth.session.sub,
    title,
    description,
    requiredSkills,
    niceToHaveSkills,
    minExperienceYears,
    educationLevel,
    location,
    employmentType,
    shortlistSize,
    status: isJobStatus(status) ? status : "draft",
    source,
  });

  revalidateJobsListing();

  return NextResponse.json(
    {
      success: true,
      data: serializeJob(job),
    },
    { status: 201 },
  );
}
