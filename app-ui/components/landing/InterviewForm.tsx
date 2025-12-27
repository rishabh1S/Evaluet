import { Card, YStack, XStack, Text, Input, TextArea, Button } from "tamagui";
import { Briefcase, TrendingUp, FileText, Upload } from "@tamagui/lucide-icons";
import { JobLevelPicker } from "components/JobLevelPicker";
import { ReactNode } from "react";

type Props = {
  jobRole: string;
  setJobRole: (v: string) => void;
  jobLevel: string;
  setJobLevel: (v: string) => void;
  jobDesc: string;
  setJobDesc: (v: string) => void;
  resume: any;
  onPickResume: () => void;
  children?: ReactNode;
};

export function InterviewForm({
  jobRole,
  setJobRole,
  jobLevel,
  setJobLevel,
  jobDesc,
  setJobDesc,
  resume,
  onPickResume,
  children,
}: Readonly<Props>) {
  return (
      <Card
        elevate
        bg="rgba(255,255,255,0.05)"
        bordered
        borderColor="rgba(255,255,255,0.1)"
        p="$5"
        gap="$4"
      >
      {/* Job Role Input */}
      <YStack gap="$2">
        <XStack gap="$2" items="center">
          <Briefcase size={18} color="rgba(255,255,255,0.7)" />
          <Text color="rgba(255,255,255,0.9)" fontSize={14} fontWeight="600">
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
            borderColor: "#351B98",
            bg: "rgba(0,0,0,0.4)",
          }}
        />
      </YStack>

      {/* Job Level Select */}
      <YStack gap="$2">
        <XStack gap="$2" items="center">
          <TrendingUp size={18} color="rgba(255,255,255,0.7)" />
          <Text color="rgba(255,255,255,0.9)" fontSize={14} fontWeight="600">
            Job Level
          </Text>
        </XStack>
        <JobLevelPicker jobLevel={jobLevel} setJobLevel={setJobLevel} />
      </YStack>

      {children}

      {/* Job Description Input */}
      <YStack gap="$2">
        <XStack gap="$2" items="center">
          <FileText size={18} color="rgba(255,255,255,0.7)" />
          <Text color="rgba(255,255,255,0.9)" fontSize={14} fontWeight="600">
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
            borderColor: "#351B98",
            bg: "rgba(0,0,0,0.4)",
          }}
        />
      </YStack>

      {/* Resume Upload Button */}
      <Button
        onPress={onPickResume}
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
  );
}
