import { createSlice, type Draft, type PayloadAction } from "@reduxjs/toolkit";

export type ScreeningRecord = {
  id: string;
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt?: string;
  updatedAt?: string;
};

type ScreeningsStatus = "idle" | "loading" | "loaded" | "error";

export type ScreeningsState = {
  items: ScreeningRecord[];
  status: ScreeningsStatus;
  error: string | null;
};

const initialState: ScreeningsState = {
  items: [],
  status: "idle",
  error: null,
};

const screeningsSlice = createSlice({
  name: "screenings",
  initialState,
  reducers: {
    setScreenings: (state: Draft<ScreeningsState>, action: PayloadAction<ScreeningRecord[]>) => {
      state.items = action.payload;
      state.status = "loaded";
      state.error = null;
    },
    upsertScreening: (state: Draft<ScreeningsState>, action: PayloadAction<ScreeningRecord>) => {
      const record = action.payload;
      const existingIndex = state.items.findIndex((item: ScreeningRecord) => item.id === record.id);
      if (existingIndex === -1) {
        state.items.push(record);
      } else {
        state.items[existingIndex] = record;
      }
    },
    removeScreening: (state: Draft<ScreeningsState>, action: PayloadAction<string>) => {
      state.items = state.items.filter((item: ScreeningRecord) => item.id !== action.payload);
    },
    setScreeningsStatus: (state: Draft<ScreeningsState>, action: PayloadAction<ScreeningsStatus>) => {
      state.status = action.payload;
    },
    setScreeningsError: (state: Draft<ScreeningsState>, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      if (action.payload) {
        state.status = "error";
      }
    },
    resetScreeningsState: () => initialState,
  },
});

export const { removeScreening, resetScreeningsState, setScreenings, setScreeningsError, setScreeningsStatus, upsertScreening } =
  screeningsSlice.actions;
export default screeningsSlice.reducer;
