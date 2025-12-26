import { useQuery } from "@tanstack/react-query";
import { API_BASE } from "../env";
import { authFetch } from "../auth";

export type Interviewer = {
  id: string;
  name: string;
  description?: string;
  profile_image_url?: string;
  focus_areas?: string;
};

async function fetchInterviewers(): Promise<Interviewer[]> {
  const res = await authFetch(
    `${API_BASE}/api/interview/all_interviewers`
  );

  if (!res.ok) {
    throw new Error("Failed to load interviewers");
  }

  return res.json();
}

export function useInterviewers() {
  return useQuery({
    queryKey: ["interviewers"],
    queryFn: fetchInterviewers,
  });
}
