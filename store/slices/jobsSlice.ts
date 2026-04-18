import { createSlice, type Draft, type PayloadAction } from "@reduxjs/toolkit";

export type JobSummary = {
  id: string;
  title: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

type JobsStatus = "idle" | "loading" | "loaded" | "error";

export type JobsState = {
  items: JobSummary[];
  status: JobsStatus;
  error: string | null;
};

const initialState: JobsState = {
  items: [],
  status: "idle",
  error: null,
};

const jobsSlice = createSlice({
  name: "jobs",
  initialState,
  reducers: {
    setJobs: (state: Draft<JobsState>, action: PayloadAction<JobSummary[]>) => {
      state.items = action.payload;
      state.status = "loaded";
      state.error = null;
    },
    addJob: (state: Draft<JobsState>, action: PayloadAction<JobSummary>) => {
      state.items = [action.payload, ...state.items];
    },
    updateJob: (state: Draft<JobsState>, action: PayloadAction<JobSummary>) => {
      state.items = state.items.map((job: JobSummary) => (job.id === action.payload.id ? action.payload : job));
    },
    removeJob: (state: Draft<JobsState>, action: PayloadAction<string>) => {
      state.items = state.items.filter((job: JobSummary) => job.id !== action.payload);
    },
    setJobsStatus: (state: Draft<JobsState>, action: PayloadAction<JobsStatus>) => {
      state.status = action.payload;
    },
    setJobsError: (state: Draft<JobsState>, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      if (action.payload) {
        state.status = "error";
      }
    },
    resetJobsState: () => initialState,
  },
});

export const { addJob, removeJob, resetJobsState, setJobs, setJobsError, setJobsStatus, updateJob } = jobsSlice.actions;
export default jobsSlice.reducer;
