import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { JobsIndexState, performJobsFetch } from "@/components/jobs/JobsIndex";

const baseCounts = { all: 1, draft: 0, open: 0, screening: 0, closed: 0 };
const basePagination = { page: 1, pageSize: 10, total: 1, totalPages: 1 };

function createState(overrides?: Partial<JobsIndexState>): JobsIndexState {
  return {
    jobs: [],
    counts: baseCounts,
    pagination: basePagination,
    isLoading: false,
    error: null,
    ...overrides,
  };
}

test("performJobsFetch updates state and returns endpoint on success", async () => {
  const initialState = createState();
  let currentState = initialState;
  const setState = (updater: any) => {
    currentState = typeof updater === "function" ? updater(currentState) : updater;
  };

  const fetchMock = mock.fn(async () =>
    new Response(
      JSON.stringify({
        success: true,
        data: [
          {
            id: "job-1",
            title: "Sample",
            description: "desc",
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
        counts: { ...baseCounts, open: 1, all: 1 },
        pagination: basePagination,
      }),
      { status: 200 },
    ),
  );

  const result = await performJobsFetch({ status: "open", fetchImpl: fetchMock as unknown as typeof fetch }, setState);

  assert.ok(result);
  assert.equal(result?.endpoint, "/api/jobs?status=open");
  assert.equal(fetchMock.mock.callCount(), 1);
  assert.equal(currentState.isLoading, false);
  assert.equal(currentState.error, null);
  assert.equal(currentState.jobs.length, 1);
  assert.equal(currentState.counts.open, 1);
});

test("performJobsFetch stores error message on failure", async () => {
  let currentState = createState();
  const setState = (updater: any) => {
    currentState = typeof updater === "function" ? updater(currentState) : updater;
  };

  const fetchMock = mock.fn(async () =>
    new Response(JSON.stringify({ success: false, error: "Boom" }), { status: 500 }),
  );

  const result = await performJobsFetch({ status: "open", fetchImpl: fetchMock as unknown as typeof fetch }, setState);

  assert.equal(result, null);
  assert.equal(currentState.isLoading, false);
  assert.equal(currentState.error, "Boom");
});
