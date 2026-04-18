import assert from "node:assert/strict";
import { test, mock } from "node:test";

const ROUTE_PATH = "../../app/api/jobs/route.ts";

const baseSession = {
  session: { sub: "user-1" },
  response: null,
} as const;

function buildRequest(path: string) {
  return new Request(`http://localhost${path}`);
}

test("GET /api/jobs rejects invalid status query", async (t) => {
  const sessionModule = await import("@/lib/session");
  const jobsServiceModule = await import("@/lib/jobs-service");

  const requireSessionMock = mock.method(sessionModule, "requireSession", async () => baseSession);
  const fetchJobsListingMock = mock.method(jobsServiceModule, "fetchJobsListing", async () => {
    throw new Error("fetchJobsListing should not be invoked");
  });

  try {
    const { GET } = await import(`${ROUTE_PATH}?test=${t.name}`);
    const response = await GET(buildRequest("/api/jobs?status=invalid"));

    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.equal(payload.success, false);
    assert.match(payload.error, /Invalid query/i);
    assert.equal(fetchJobsListingMock.mock.callCount(), 0);
  } finally {
    requireSessionMock.mock.restore();
    fetchJobsListingMock.mock.restore();
  }
});

test("GET /api/jobs forwards pagination filters to listing service", async (t) => {
  let receivedParams: Record<string, unknown> | undefined;

  const sessionModule = await import("@/lib/session");
  const jobsServiceModule = await import("@/lib/jobs-service");

  const requireSessionMock = mock.method(sessionModule, "requireSession", async () => baseSession);
  const fetchJobsListingMock = mock.method(jobsServiceModule, "fetchJobsListing", async (params: Record<string, unknown>) => {
    receivedParams = params;
    return {
      jobs: [
        {
          id: "job-123",
          title: "Test role",
          description: "A role",
          requiredSkills: [],
          niceToHaveSkills: [],
          minExperienceYears: 0,
          educationLevel: "any",
          location: "Kigali",
          employmentType: "full-time",
          shortlistSize: 10,
          status: "open",
          source: "umurava",
          createdAt: null,
          updatedAt: null,
        },
      ],
      counts: { all: 1, draft: 0, open: 1, screening: 0, closed: 0 },
      pagination: { page: 2, pageSize: 5, total: 1, totalPages: 1 },
    };
  });

  try {
    const { GET } = await import(`${ROUTE_PATH}?test=${t.name}`);
    const response = await GET(buildRequest("/api/jobs?status=open&page=2&limit=5"));
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.success, true);
    assert.deepEqual(receivedParams, {
      createdBy: "user-1",
      status: "open",
      search: undefined,
      page: 2,
      limit: 5,
    });
    assert.equal(fetchJobsListingMock.mock.callCount(), 1);
  } finally {
    requireSessionMock.mock.restore();
    fetchJobsListingMock.mock.restore();
  }
});
