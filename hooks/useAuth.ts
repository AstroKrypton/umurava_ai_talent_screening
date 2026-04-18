"use client";

import { useAppSelector } from "@/store/hooks";
import type { RootState } from "@/store";

export function useAuth() {
  return useAppSelector((state: RootState) => state.auth);
}
