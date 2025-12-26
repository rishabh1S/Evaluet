import { useQuery } from "@tanstack/react-query";
import { API_BASE } from "../env";
import { authFetch } from "../auth";
import { Interviewer } from "lib/store/interviewerStore";

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
