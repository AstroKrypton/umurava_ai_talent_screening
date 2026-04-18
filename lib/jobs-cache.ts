import { revalidatePath, revalidateTag } from "next/cache";

export const JOBS_LISTING_PATH = "/jobs";
export const JOBS_LISTING_TAG = "jobs:list";

export function revalidateJobsListing() {
  revalidatePath(JOBS_LISTING_PATH);
  revalidateTag(JOBS_LISTING_TAG);
}
