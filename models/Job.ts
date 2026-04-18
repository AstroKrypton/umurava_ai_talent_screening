import { Schema, model, models } from "mongoose";

const jobSchema = new Schema(
  {
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    requiredSkills: {
      type: [String],
      default: [],
    },
    niceToHaveSkills: {
      type: [String],
      default: [],
    },
    minExperienceYears: {
      type: Number,
      default: 0,
      min: 0,
    },
    educationLevel: {
      type: String,
      enum: ["any", "bachelor", "master", "phd"],
      default: "any",
      required: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    employmentType: {
      type: String,
      enum: ["full-time", "part-time", "contract"],
      required: true,
    },
    shortlistSize: {
      type: Number,
      enum: [10, 20],
      default: 10,
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "open", "screening", "closed"],
      default: "draft",
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ["umurava", "external"],
      required: true,
      default: "umurava",
    },
  },
  {
    timestamps: true,
  },
);

jobSchema.index({ createdBy: 1, status: 1 });

export const JobModel = models.Job || model("Job", jobSchema);
