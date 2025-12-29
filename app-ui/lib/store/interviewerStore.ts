import { create } from "zustand";

export type Interviewer = {
  id: string;
  name: string;
  description?: string;
  profile_image_url?: string;
  idle_video_url?: string;
  talking_video_url?: string;
  focus_areas?: string;
};

type InterviewerState = {
  interviewer: Interviewer | null;
  setInterviewer: (i: Interviewer) => void;
  clear: () => void;
};

export const useInterviewerStore = create<InterviewerState>((set) => ({
  interviewer: null,
  setInterviewer: (i) => set({ interviewer: i }),
  clear: () => set({ interviewer: null }),
}));
