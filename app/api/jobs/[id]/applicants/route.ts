import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireSession } from "@/lib/session";
import { ApplicantModel } from "@/models/Applicant";
import { JobModel } from "@/models/Job";

function isValidObjectId(value: string) {
  return Types.ObjectId.isValid(value);
}

async function getOwnedJob(jobId: string, userId: string) {
  await connectToDatabase();
  return JobModel.findOne({ _id: jobId, createdBy: userId }).lean();
}

export async function GET(_request: Request, context: RouteContext<"/api/jobs/[id]/applicants">) {
  const auth = await requireSession();
  if (auth.response || !auth.session) return auth.response;

  const { id } = await context.params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ success: false, error: "Invalid job id." }, { status: 400 });
  }

  const job = await getOwnedJob(id, auth.session.sub);
  if (!job) {
    return NextResponse.json({ success: false, error: "Job not found." }, { status: 404 });
  }

  const applicants = await ApplicantModel.find({ jobId: id }).sort({ createdAt: -1 }).lean();

  return NextResponse.json({
    success: true,
    data: applicants.map((applicant) => ({
      id: String(applicant._id),
      jobId: String(applicant.jobId),
      source: applicant.source,
      umuravaProfileId: applicant.umuravaProfileId,
      firstName: applicant.firstName,
      lastName: applicant.lastName,
      email: applicant.email,
      headline: applicant.headline,
      bio: applicant.bio,
      location: applicant.location,
      skills: applicant.skills,
      languages: applicant.languages,
      experience: applicant.experience,
      education: applicant.education,
      certifications: applicant.certifications,
      projects: applicant.projects,
      availability: applicant.availability,
      socialLinks: applicant.socialLinks,
      resumeUrl: applicant.resumeUrl,
      rawResumeText: applicant.rawResumeText,
      createdAt: applicant.createdAt,
      updatedAt: applicant.updatedAt,
    })),
  });
}

export async function POST(request: Request, context: RouteContext<"/api/jobs/[id]/applicants">) {
  const auth = await requireSession();
  if (auth.response || !auth.session) return auth.response;

  const { id } = await context.params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ success: false, error: "Invalid job id." }, { status: 400 });
  }

  const job = await getOwnedJob(id, auth.session.sub);
  if (!job) {
    return NextResponse.json({ success: false, error: "Job not found." }, { status: 404 });
  }

  const body = (await request.json()) as {
    source?: "umurava" | "external";
    umuravaProfileId?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    headline?: string;
    bio?: string;
    location?: string;
    skills?: Array<{ name: string; level: "Beginner" | "Intermediate" | "Advanced" | "Expert"; yearsOfExperience: number }>;
    languages?: Array<{ name: string; proficiency: "Basic" | "Conversational" | "Fluent" | "Native" }>;
    experience?: Array<{ company: string; role: string; startDate: string; endDate: string; description: string; technologies: string[]; isCurrent: boolean }>;
    education?: Array<{ institution: string; degree: string; fieldOfStudy: string; startYear: number; endYear?: number }>;
    certifications?: Array<{ name: string; issuer: string; issueDate: string }>;
    projects?: Array<{ name: string; description: string; technologies: string[]; role: string; link?: string; startDate: string; endDate?: string }>;
    availability?: { status: "Available" | "Open to Opportunities" | "Not Available"; type: "Full-time" | "Part-time" | "Contract"; startDate?: string };
    socialLinks?: { linkedin?: string; github?: string; portfolio?: string };
    resumeUrl?: string;
    rawResumeText?: string;
  };

  const firstName = body.firstName?.trim() || "";
  const lastName = body.lastName?.trim() || "";
  const email = body.email?.trim().toLowerCase() || "";
  const headline = body.headline?.trim() || "";
  const location = body.location?.trim() || "";

  if (!firstName || !lastName || !email || !headline || !location) {
    return NextResponse.json(
      { success: false, error: "firstName, lastName, email, headline, and location are required." },
      { status: 400 },
    );
  }

  if (!Array.isArray(body.skills) || body.skills.length === 0) {
    return NextResponse.json({ success: false, error: "At least one skill is required." }, { status: 400 });
  }

  if (!Array.isArray(body.experience) || body.experience.length === 0) {
    return NextResponse.json({ success: false, error: "At least one experience entry is required." }, { status: 400 });
  }

  if (!Array.isArray(body.education) || body.education.length === 0) {
    return NextResponse.json({ success: false, error: "At least one education entry is required." }, { status: 400 });
  }

  if (!Array.isArray(body.projects) || body.projects.length === 0) {
    return NextResponse.json({ success: false, error: "At least one project entry is required." }, { status: 400 });
  }

  if (!body.availability) {
    return NextResponse.json({ success: false, error: "Availability is required." }, { status: 400 });
  }

  try {
    const applicant = await ApplicantModel.create({
      jobId: id,
      source: body.source || job.source,
      umuravaProfileId: body.umuravaProfileId?.trim(),
      firstName,
      lastName,
      email,
      headline,
      bio: body.bio?.trim(),
      location,
      skills: body.skills,
      languages: body.languages || [],
      experience: body.experience,
      education: body.education,
      certifications: body.certifications || [],
      projects: body.projects,
      availability: body.availability,
      socialLinks: body.socialLinks,
      resumeUrl: body.resumeUrl?.trim(),
      rawResumeText: body.rawResumeText,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: String(applicant._id),
          jobId: String(applicant.jobId),
          source: applicant.source,
          firstName: applicant.firstName,
          lastName: applicant.lastName,
          email: applicant.email,
          headline: applicant.headline,
          location: applicant.location,
          skills: applicant.skills,
          experience: applicant.experience,
          education: applicant.education,
          projects: applicant.projects,
          availability: applicant.availability,
          createdAt: applicant.createdAt,
          updatedAt: applicant.updatedAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("duplicate key")
        ? "This applicant already exists for the selected job."
        : "Unable to create applicant.";

    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
