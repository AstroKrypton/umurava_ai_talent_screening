import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireSession } from "@/lib/session";
import { ApplicantModel } from "@/models/Applicant";
import { JobModel } from "@/models/Job";
import { ScreeningModel } from "@/models/Screening";

function computeDelta(recent: number, previous: number) {
  return recent - previous;
}

type AggregateResult = {
  total?: number;
  recent?: number;
  previous?: number;
};

type ScreeningsAggregateResult = AggregateResult & {
  active?: number;
};

function normaliseStat(result?: AggregateResult) {
  return {
    value: result?.total ?? 0,
    delta: computeDelta(result?.recent ?? 0, result?.previous ?? 0),
  };
}

function normaliseActiveStat(result?: ScreeningsAggregateResult) {
  return {
    value: result?.active ?? result?.total ?? 0,
    delta: computeDelta(result?.recent ?? 0, result?.previous ?? 0),
  };
}

export async function GET() {
  const auth = await requireSession();
  if (auth.response || !auth.session) return auth.response;

  await connectToDatabase();

  const rawUserId = auth.session.sub;
  const ownerObjectId = Types.ObjectId.isValid(rawUserId) ? new Types.ObjectId(rawUserId) : null;
  const jobOwnerMatch = ownerObjectId ?? rawUserId;

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(now.getDate() - 14);

  const ownerMatchStage = ownerObjectId
    ? { $match: { createdBy: ownerObjectId } }
    : { $match: { createdBy: jobOwnerMatch } };

  const jobsPromise = JobModel.aggregate<AggregateResult>([
    ownerMatchStage,
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        recent: {
          $sum: {
            $cond: [{ $gte: ["$createdAt", sevenDaysAgo] }, 1, 0],
          },
        },
        previous: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gte: ["$createdAt", fourteenDaysAgo] },
                  { $lt: ["$createdAt", sevenDaysAgo] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  const screeningsPromise = ScreeningModel.aggregate<ScreeningsAggregateResult>([
    ownerObjectId
    ? {
        $match: {
          triggeredBy: ownerObjectId,
          status: { $in: ["pending", "processing"] },
        },
      }
    : {
        $match: {
          triggeredBy: jobOwnerMatch,
          status: { $in: ["pending", "processing"] },
        },
      },
    {
      $group: {
        _id: null,
        active: { $sum: 1 },
        recent: {
          $sum: {
            $cond: [{ $gte: ["$createdAt", sevenDaysAgo] }, 1, 0],
          },
        },
        previous: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gte: ["$createdAt", fourteenDaysAgo] },
                  { $lt: ["$createdAt", sevenDaysAgo] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  const applicantsPipelineMatch = ownerObjectId
  ? { "job.createdBy": ownerObjectId }
  : { "job.createdBy": jobOwnerMatch };

  const applicantsPromise = ApplicantModel.aggregate<AggregateResult>([
    {
      $lookup: {
        from: "jobs",
        localField: "jobId",
        foreignField: "_id",
        as: "job",
      },
    },
    { $unwind: "$job" },
    { $match: applicantsPipelineMatch },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        recent: {
          $sum: {
            $cond: [{ $gte: ["$createdAt", sevenDaysAgo] }, 1, 0],
          },
        },
        previous: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gte: ["$createdAt", fourteenDaysAgo] },
                  { $lt: ["$createdAt", sevenDaysAgo] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  const shortlistedPromise = ScreeningModel.aggregate<AggregateResult>([
    ownerObjectId
    ? {
        $match: {
          triggeredBy: ownerObjectId,
          status: "completed",
        },
      }
    : {
        $match: {
          triggeredBy: jobOwnerMatch,
          status: "completed",
        },
      },
    {
      $project: {
        shortlistedCount: {
          $size: {
            $filter: {
              input: "$results",
              as: "result",
              cond: { $eq: ["$$result.isShortlisted", true] },
            },
          },
        },
        createdAt: 1,
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$shortlistedCount" },
        recent: {
          $sum: {
            $cond: [{ $gte: ["$createdAt", sevenDaysAgo] }, "$shortlistedCount", 0],
          },
        },
        previous: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gte: ["$createdAt", fourteenDaysAgo] },
                  { $lt: ["$createdAt", sevenDaysAgo] },
                ],
              },
              "$shortlistedCount",
              0,
            ],
          },
        },
      },
    },
  ]);

  const [jobAggregate, screeningAggregate, applicantAggregate, shortlistedAggregate] = await Promise.all([
    jobsPromise,
    screeningsPromise,
    applicantsPromise,
    shortlistedPromise,
  ]);

  const totalJobs = normaliseStat(jobAggregate[0]);
  const activeScreenings = normaliseActiveStat(screeningAggregate[0]);
  const applicants = normaliseStat(applicantAggregate[0]);
  const shortlisted = normaliseStat(shortlistedAggregate[0]);

  return NextResponse.json({
    success: true,
    data: {
      totalJobs,
      activeScreenings,
      applicants,
      shortlisted,
    },
  });
}
