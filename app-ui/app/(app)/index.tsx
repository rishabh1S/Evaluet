import { YStack, Button, H2, Text, ScrollView, XStack } from "tamagui";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { API_BASE } from "../../lib/env";
import { LinearGradient } from "expo-linear-gradient";
import { Play } from "@tamagui/lucide-icons";
import { authFetch } from "lib/auth";
import { useInterviewers } from "lib/hooks/useInterviewers";
import {
  InterviewerCarousel,
  InterviewerInfoSheet,
  InterviewForm,
} from "components/landing";
import { useInterviewerStore } from "lib/store/interviewerStore";

type Interviewer = {
  id: string;
  name: string;
  description?: string;
  profile_image_url?: string;
  focus_areas?: string;
};

export default function IndexScreen() {
  const [jobRole, setJobRole] = useState("Software Engineer");
  const [jobLevel, setJobLevel] = useState("Mid-Level");
  const [jobDesc, setJobDesc] = useState(
    "Must know Java, Springboot, Microservices."
  );
  const [resume, setResume] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedInterviewer, setSelectedInterviewer] =
    useState<Interviewer | null>(null);
  const router = useRouter();
  const {
    data: interviewers = [],
    isLoading: interviewersLoading,
    isError: interviewersError,
  } = useInterviewers();
  const [infoInterviewer, setInfoInterviewer] = useState<Interviewer | null>(
    null
  );
  const setGlobalInterviewer = useInterviewerStore((s) => s.setInterviewer);

  useEffect(() => {
    if (!selectedInterviewer && interviewers.length > 0) {
      setSelectedInterviewer(interviewers[0]);
    }
  }, [interviewers, selectedInterviewer]);

  const pickResume = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
    });
    if (!result.canceled) setResume(result.assets[0]);
  };

  const startInterview = async () => {
    if (!jobRole || !jobLevel || !jobDesc || !resume || !selectedInterviewer) {
      alert("Please fill all fields");
      return;
    }
    setGlobalInterviewer(selectedInterviewer);
    setLoading(true);
    const form = new FormData();
    form.append("resume", {
      uri: resume.uri,
      name: resume.name,
      type: "application/pdf",
    } as any);
    form.append("job_role", jobRole);
    form.append("job_level", jobLevel);
    form.append("job_desc", jobDesc);
    form.append("interviewer_id", selectedInterviewer.id);

    try {
      const res = await authFetch(`${API_BASE}/api/interview/init`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const data = await res.json();
      router.navigate(`/interview/${data.session_id}` as any);
    } catch (err: any) {
      console.error("Init interview failed:", err);
      alert(err.message ?? "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={["#0B1220", "#0F172A", "#111827"]}
      style={{ flex: 1 }}
    >
      <ScrollView
        flex={1}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <YStack justify="center" px="$6" py="$8" gap="$5">
          {/* Header */}
          <YStack gap="$2" items="center">
            <H2 text="center" fontWeight="500">
              AI Interview Setup
            </H2>
            <Text text="center">Prepare for your next opportunity</Text>
          </YStack>

          {/* Form Card */}
          <InterviewForm
            jobRole={jobRole}
            setJobRole={setJobRole}
            jobLevel={jobLevel}
            setJobLevel={setJobLevel}
            jobDesc={jobDesc}
            setJobDesc={setJobDesc}
            resume={resume}
            onPickResume={pickResume}
          >
            <YStack gap="$3">
              <XStack gap="$2" items="center">
                <Text
                  color="rgba(255,255,255,0.9)"
                  fontSize={14}
                  fontWeight="600"
                >
                  Choose Interviewer
                </Text>
              </XStack>

              <InterviewerCarousel
                interviewers={interviewers}
                selected={selectedInterviewer}
                onSelect={setSelectedInterviewer}
                onInfo={setInfoInterviewer}
                loading={interviewersLoading}
                error={interviewersError}
              />
            </YStack>
          </InterviewForm>

          {/* Start Button */}
          <Button
            onPress={startInterview}
            iconAfter={<Play size={22} color="white" fill="white" />}
            height={58}
            disabled={loading}
            opacity={loading ? 0.7 : 1}
            bg="#2563EB"
            pressStyle={{ bg: "#1D4ED8", scale: 0.98 }}
          >
            <Text color="white" fontSize={17} fontWeight="700">
              {loading ? "Starting..." : "Start Interview"}
            </Text>
          </Button>
        </YStack>
      </ScrollView>
      <InterviewerInfoSheet
        interviewer={infoInterviewer}
        onClose={() => setInfoInterviewer(null)}
      />
    </LinearGradient>
  );
}
