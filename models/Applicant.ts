import { Schema, model, models } from "mongoose";

const skillSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    level: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced", "Expert"],
      required: true,
    },
    yearsOfExperience: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const languageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    proficiency: {
      type: String,
      enum: ["Basic", "Conversational", "Fluent", "Native"],
      required: true,
    },
  },
  { _id: false },
);

const experienceSchema = new Schema(
  {
    company: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    startDate: { type: String, required: true, trim: true },
    endDate: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    technologies: { type: [String], default: [] },
    isCurrent: { type: Boolean, default: false },
  },
  { _id: false },
);

const educationSchema = new Schema(
  {
    institution: { type: String, required: true, trim: true },
    degree: { type: String, required: true, trim: true },
    fieldOfStudy: { type: String, required: true, trim: true },
    startYear: { type: Number, required: true },
    endYear: { type: Number },
  },
  { _id: false },
);

const certificationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    issuer: { type: String, required: true, trim: true },
    issueDate: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const projectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    technologies: { type: [String], default: [] },
    role: { type: String, required: true, trim: true },
    link: { type: String, trim: true },
    startDate: { type: String, required: true, trim: true },
    endDate: { type: String, trim: true },
  },
  { _id: false },
);

const availabilitySchema = new Schema(
  {
    status: {
      type: String,
      enum: ["Available", "Open to Opportunities", "Not Available"],
      required: true,
    },
    type: {
      type: String,
      enum: ["Full-time", "Part-time", "Contract"],
      required: true,
    },
    startDate: { type: String, trim: true },
  },
  { _id: false },
);

const socialLinksSchema = new Schema(
  {
    linkedin: { type: String, trim: true },
    github: { type: String, trim: true },
    portfolio: { type: String, trim: true },
  },
  { _id: false },
);

const applicantSchema = new Schema(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ["umurava", "external"],
      required: true,
    },
    umuravaProfileId: { type: String, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    headline: { type: String, required: true, trim: true },
    bio: { type: String, trim: true },
    location: { type: String, required: true, trim: true },
    skills: { type: [skillSchema], default: [] },
    languages: { type: [languageSchema], default: [] },
    experience: { type: [experienceSchema], default: [] },
    education: { type: [educationSchema], default: [] },
    certifications: { type: [certificationSchema], default: [] },
    projects: { type: [projectSchema], default: [] },
    availability: { type: availabilitySchema, required: true },
    socialLinks: { type: socialLinksSchema },
    resumeUrl: { type: String, trim: true },
    rawResumeText: { type: String },
  },
  {
    timestamps: true,
  },
);

applicantSchema.index({ jobId: 1, source: 1 });
applicantSchema.index({ email: 1, jobId: 1 }, { unique: true });

export const ApplicantModel = models.Applicant || model("Applicant", applicantSchema);
