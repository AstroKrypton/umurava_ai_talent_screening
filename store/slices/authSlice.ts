import { createSlice, type Draft, type PayloadAction } from "@reduxjs/toolkit";

export type AuthUser = {
  id: string;
  name: string;
  organisation: string;
  email: string;
  role: string;
};

type AuthStatus = "idle" | "authenticating" | "authenticated" | "error";

export type AuthState = {
  user: AuthUser | null;
  status: AuthStatus;
  error: string | null;
};

const initialState: AuthState = {
  user: null,
  status: "idle",
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuthPending: (state: Draft<AuthState>) => {
      state.status = "authenticating";
      state.error = null;
    },
    setAuthUser: (state: Draft<AuthState>, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
      state.status = "authenticated";
      state.error = null;
    },
    setAuthError: (state: Draft<AuthState>, action: PayloadAction<string>) => {
      state.status = "error";
      state.error = action.payload;
    },
    clearAuth: (state: Draft<AuthState>) => {
      state.user = null;
      state.status = "idle";
      state.error = null;
    },
  },
});

export const { clearAuth, setAuthError, setAuthPending, setAuthUser } = authSlice.actions;
export default authSlice.reducer;
