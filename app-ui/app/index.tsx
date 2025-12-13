import {
  YStack,
  Button,
  Input,
  H2,
  Text,
  Card,
  XStack,
  TextArea,
} from "tamagui";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { API_BASE } from "../lib/env";
import { LinearGradient } from "expo-linear-gradient";
import {
  Upload,
  Briefcase,
  TrendingUp,
  FileText,
  Play,
} from "@tamagui/lucide-icons";
import { JobLevelPicker } from "components/JobLevelPicker";

export default function IndexScreen() {
  const [userId, setUserId] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [jobLevel, setJobLevel] = useState("mid-level");
  const [jobDesc, setJobDesc] = useState("");
  const [resume, setResume] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const pickResume = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
    });
    if (!result.canceled) setResume(result.assets[0]);
  };

  const startInterview = async () => {
    if (!userId || !jobRole || !jobLevel || !jobDesc || !resume) {
      alert("Please fill all fields");
      return;
    }
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
    form.append("user_id", userId);

    try {
      const res = await fetch(`${API_BASE}/api/interview/init`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();

      router.navigate(`/interview/${data.session_id}` as any);
    } catch (err: any) {
      console.error('Init interview failed:', err)
      alert(err.message ?? 'Network error')
    } finally {
      setLoading(false)
    }
  };

  return (
    <LinearGradient
      colors={["#0f172a", "#1e293b", "#334155"]}
      style={{ flex: 1 }}
    >
      <YStack flex={1} justify="center" px="$6" py="$8" gap="$5">
        {/* Header */}
        <YStack gap="$2" items="center" mb="$4">
          <H2 color="white" text="center" fontWeight="700">
            AI Interview Setup
          </H2>
          <Text color="rgba(255,255,255,0.6)" text="center" fontSize={15}>
            Prepare for your next opportunity
          </Text>
        </YStack>

        {/* Form Card */}
        <Card
          elevate
          bg="rgba(255,255,255,0.08)"
          bordered
          borderColor="rgba(255,255,255,0.1)"
          p="$5"
          gap="$4"
        >
          {/* User ID Input */}
          <YStack gap="$2">
            <XStack gap="$2" items="center">
              <FileText size={18} color="rgba(255,255,255,0.7)" />
              <Text
                color="rgba(255,255,255,0.9)"
                fontSize={14}
                fontWeight="600"
              >
                User ID / Email
              </Text>
            </XStack>
            <Input
              textContentType="emailAddress"
              placeholder="Enter your email"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={userId}
              onChangeText={setUserId}
              bg="rgba(0,0,0,0.3)"
              borderColor="rgba(255,255,255,0.2)"
              color="white"
              height={50}
              focusStyle={{
                borderColor: "#60a5fa",
                bg: "rgba(0,0,0,0.4)",
              }}
            />
          </YStack>

          {/* Job Role Input */}
          <YStack gap="$2">
            <XStack gap="$2" items="center">
              <Briefcase size={18} color="rgba(255,255,255,0.7)" />
              <Text
                color="rgba(255,255,255,0.9)"
                fontSize={14}
                fontWeight="600"
              >
                Job Role
              </Text>
            </XStack>
            <Input
              textContentType="jobTitle"
              placeholder="e.g. Senior Software Engineer"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={jobRole}
              onChangeText={setJobRole}
              bg="rgba(0,0,0,0.3)"
              borderColor="rgba(255,255,255,0.2)"
              color="white"
              height={50}
              focusStyle={{
                borderColor: "#60a5fa",
                bg: "rgba(0,0,0,0.4)",
              }}
            />
          </YStack>

          {/* Job Level Select */}
          <YStack gap="$2">
            <XStack gap="$2" items="center">
              <TrendingUp size={18} color="rgba(255,255,255,0.7)" />
              <Text
                color="rgba(255,255,255,0.9)"
                fontSize={14}
                fontWeight="600"
              >
                Job Level
              </Text>
            </XStack>
            <JobLevelPicker jobLevel={jobLevel} setJobLevel={setJobLevel} />
          </YStack>

          {/* Job Description Input */}
          <YStack gap="$2">
            <XStack gap="$2" items="center">
              <FileText size={18} color="rgba(255,255,255,0.7)" />
              <Text
                color="rgba(255,255,255,0.9)"
                fontSize={14}
                fontWeight="600"
              >
                Job Description
              </Text>
            </XStack>
            <TextArea
              placeholder="Brief description of the role"
              placeholderTextColor="rgba(255,255,255,0.4)"
              size="$4"
              value={jobDesc}
              onChangeText={setJobDesc}
              bg="rgba(0,0,0,0.3)"
              borderColor="rgba(255,255,255,0.2)"
              color="white"
              multiline
              focusStyle={{
                borderColor: "#60a5fa",
                bg: "rgba(0,0,0,0.4)",
              }}
            />
          </YStack>

          {/* Resume Upload Button */}
          <Button
            onPress={pickResume}
            bg={resume ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.1)"}
            borderColor={resume ? "#22c55e" : "rgba(255,255,255,0.2)"}
            borderWidth={1}
            height={56}
            pressStyle={{
              bg: resume ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.15)",
            }}
          >
            <XStack gap="$3" items="center">
              <Upload size={20} color={resume ? "#22c55e" : "white"} />
              <Text
                color={resume ? "#22c55e" : "white"}
                fontSize={15}
                fontWeight="600"
              >
                {resume ? "Resume Selected" : "Upload Resume"}
              </Text>
            </XStack>
          </Button>
        </Card>

        {/* Start Button */}
        <Button
          onPress={startInterview}
          background="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          height={58}
          disabled={loading}
          opacity={loading ? 0.7 : 1}
          pressStyle={{
            scale: 0.98,
          }}
          shadowColor="rgba(102,126,234,0.5)"
          shadowOffset={{ width: 0, height: 8 }}
          shadowOpacity={0.5}
          shadowRadius={16}
        >
          <XStack gap="$3" items="center">
            <Play size={22} color="white" fill="white" />
            <Text color="white" fontSize={17} fontWeight="700">
              {loading ? "Starting..." : "Start Interview"}
            </Text>
          </XStack>
        </Button>
      </YStack>
    </LinearGradient>
  );
}
