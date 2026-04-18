import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/store/slices/authSlice";
import applicantsReducer from "@/store/slices/applicantsSlice";
import jobsReducer from "@/store/slices/jobsSlice";
import screeningsReducer from "@/store/slices/screeningsSlice";

export const makeStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      jobs: jobsReducer,
      applicants: applicantsReducer,
      screenings: screeningsReducer,
    },
  });

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore["dispatch"];
export type RootState = ReturnType<AppStore["getState"]>;
