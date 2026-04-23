import { Schema, model, models } from "mongoose";

const screeningResultSchema = new Schema(
  {
    rank: { type: Number, required: true },
    applicantId: {
      type: Schema.Types.ObjectId,
      ref: "Applicant",
      required: true,
    },
    applicantName: { type: String, required: true, trim: true },
    overallScore: { type: Number, required: true, min: 0, max: 100 },
    skillsScore: { type: Number, required: true, min: 0, max: 100 },
    experienceScore: { type: Number, required: true, min: 0, max: 100 },
    educationScore: { type: Number, required: true, min: 0, max: 100 },
    relevanceScore: { type: Number, required: true, min: 0, max: 100 },
    strengths: { type: [String], default: [] },
    gaps: { type: [String], default: [] },
    recommendation: { type: String, required: true, trim: true },
    isShortlisted: { type: Boolean, default: false },
    insights: { type: [String], default: [] },
  },
  { _id: false },
);

const screeningSchema = new Schema(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    triggeredBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      required: true,
      default: "pending",
      index: true,
    },
    totalApplicants: { type: Number, required: true, default: 0 },
    shortlistSize: { type: Number, enum: [10, 20], required: true, default: 10 },
    results: { type: [screeningResultSchema], default: [] },
    aiModelVersion: { type: String, trim: true },
    promptVersion: { type: String, trim: true },
    processingTimeMs: { type: Number },
    usedFallback: { type: Boolean, default: false },
    error: { type: String, trim: true },
    errorMessage: { type: String, trim: true },
  },
  {
    timestamps: true,
  },
);

screeningSchema.index({ createdAt: -1 });

export const ScreeningModel = models.Screening || model("Screening", screeningSchema);
