import { createSlice, type Draft, type PayloadAction } from "@reduxjs/toolkit";

export type ApplicantRecord = {
  id: string;
  jobId: string;
  firstName: string;
  lastName: string;
  email?: string;
  source: "umurava" | "external";
};

type ApplicantsStatus = "idle" | "loading" | "loaded" | "error";

export type ApplicantsState = {
  items: ApplicantRecord[];
  status: ApplicantsStatus;
  error: string | null;
};

const initialState: ApplicantsState = {
  items: [],
  status: "idle",
  error: null,
};

const applicantsSlice = createSlice({
  name: "applicants",
  initialState,
  reducers: {
    setApplicants: (state: Draft<ApplicantsState>, action: PayloadAction<ApplicantRecord[]>) => {
      state.items = action.payload;
      state.status = "loaded";
      state.error = null;
    },
    upsertApplicant: (state: Draft<ApplicantsState>, action: PayloadAction<ApplicantRecord>) => {
      const record = action.payload;
      const existingIndex = state.items.findIndex((item: ApplicantRecord) => item.id === record.id);
      if (existingIndex === -1) {
        state.items.push(record);
      } else {
        state.items[existingIndex] = record;
      }
    },
    removeApplicant: (state: Draft<ApplicantsState>, action: PayloadAction<string>) => {
      state.items = state.items.filter((item: ApplicantRecord) => item.id !== action.payload);
    },
    setApplicantsStatus: (state: Draft<ApplicantsState>, action: PayloadAction<ApplicantsStatus>) => {
      state.status = action.payload;
    },
    setApplicantsError: (state: Draft<ApplicantsState>, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      if (action.payload) {
        state.status = "error";
      }
    },
    resetApplicantsState: () => initialState,
  },
});

export const { removeApplicant, resetApplicantsState, setApplicants, setApplicantsError, setApplicantsStatus, upsertApplicant } =
  applicantsSlice.actions;
export default applicantsSlice.reducer;
