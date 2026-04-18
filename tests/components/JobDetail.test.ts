import assert from "node:assert/strict";
import { mock, test } from "node:test";
import {
  performApplicantsFetch,
  performScreeningsFetch,
  type AsyncListState,
  type AsyncListStateSetter,
  type ApplicantListItem,
  type ScreeningListItem,
} from "@/components/jobs/JobDetail";

type ApplicantsSetState = AsyncListStateSetter<ApplicantListItem>;
type ScreeningsSetState = AsyncListStateSetter<ScreeningListItem>;

type ApplicantsState = AsyncListState<ApplicantListItem>;
type ScreeningsState = AsyncListState<ScreeningListItem>;

function createApplicantsState(overrides?: Partial<ApplicantsState>): ApplicantsState {
  return {
    items: null,
    isLoading: false,
    error: null,
    ...overrides,
  };
}

function createScreeningsState(overrides?: Partial<ScreeningsState>): ScreeningsState {
  return {
    items: null,
    isLoading: false,
    error: null,
    ...overrides,
  };
}

test("performApplicantsFetch populates applicants and clears loading on success", async () => {
  let currentState = createApplicantsState();
  const transitions: ApplicantsState[] = [];
  const setState: ApplicantsSetState = (next) => {
    currentState = typeof next === "function" ? next(currentState) : next;
    transitions.push(currentState);
  };

  const fetchMock = mock.fn(async () =>
    new Response(
      JSON.stringify({
        success: true,
        data: [
          {
            id: "app-1",
            firstName: "Aline",
            lastName: "Uwase",
            email: "aline@example.com",
            headline: "Data Analyst",
            location: "Kigali",
            source: "external",
            skills: [{ name: "SQL", level: "Advanced", yearsOfExperience: 3 }],
            createdAt: "2024-04-01T00:00:00.000Z",
            resumeUrl: "https://example.com/resume.pdf",
          },
        ],
      }),
      { status: 200 },
    ),
  );

  const result = await performApplicantsFetch({ jobId: "job-123", fetchImpl: fetchMock as unknown as typeof fetch }, setState);

  assert.equal(fetchMock.mock.callCount(), 1);
  assert.ok(result);
  assert.equal(result?.endpoint, "/api/jobs/job-123/applicants");
  assert.equal(transitions[0]?.isLoading, true);
  assert.equal(currentState.isLoading, false);
  assert.equal(currentState.error, null);
  assert.equal(currentState.items?.length, 1);
  assert.equal(currentState.items?.[0]?.resumeUrl, "https://example.com/resume.pdf");
  assert.equal(currentState.items?.[0]?.source, "external");
});

test("performApplicantsFetch retains previous items and stores error on failure", async () => {
  let currentState = createApplicantsState({ items: [] });
  const setState: ApplicantsSetState = (next) => {
    currentState = typeof next === "function" ? next(currentState) : next;
  };

  const fetchMock = mock.fn(async () =>
    new Response(JSON.stringify({ success: false, error: "Server exploded" }), { status: 500 }),
  );

  const result = await performApplicantsFetch({ jobId: "job-123", fetchImpl: fetchMock as unknown as typeof fetch }, setState);

  assert.equal(result, null);
  assert.equal(currentState.isLoading, false);
  assert.equal(currentState.error, "Server exploded");
});

test("performScreeningsFetch normalizes response and includes fallback shortlist size", async () => {
  let currentState = createScreeningsState();
  const transitions: ScreeningsState[] = [];
  const setState: ScreeningsSetState = (next) => {
    currentState = typeof next === "function" ? next(currentState) : next;
    transitions.push(currentState);
  };

  const fetchMock = mock.fn(async () =>
    new Response(
      JSON.stringify({
        success: true,
        data: [
          {
            id: "scr-1",
            status: "completed",
            totalApplicants: 120,
            processingTimeMs: 32000,
            createdAt: "2024-03-15T00:00:00.000Z",
            aiModelVersion: "gemini-1.5",
            promptVersion: "v7",
          },
        ],
      }),
      { status: 200 },
    ),
  );

  const result = await performScreeningsFetch(
    { jobId: "job-123", shortlistSize: 15, fetchImpl: fetchMock as unknown as typeof fetch },
    setState,
  );

  assert.ok(result);
  assert.equal(result?.endpoint, "/api/jobs/job-123/screenings");
  assert.equal(fetchMock.mock.callCount(), 1);
  assert.equal(transitions[0]?.isLoading, true);
  assert.equal(currentState.isLoading, false);
  assert.equal(currentState.error, null);
  assert.equal(currentState.items?.[0]?.shortlistSize, 15);
  assert.equal(currentState.items?.[0]?.status, "completed");
});

test("performScreeningsFetch surfaces default error message when network fails", async () => {
  let currentState = createScreeningsState({ items: [] });
  const setState: ScreeningsSetState = (next) => {
    currentState = typeof next === "function" ? next(currentState) : next;
  };

  const fetchMock = mock.fn(async () => {
    throw new Error("timeout");
  });

  const result = await performScreeningsFetch(
    { jobId: "job-123", shortlistSize: 5, fetchImpl: fetchMock as unknown as typeof fetch },
    setState,
  );

  assert.equal(result, null);
  assert.equal(currentState.isLoading, false);
  assert.equal(currentState.error, "timeout");
});
