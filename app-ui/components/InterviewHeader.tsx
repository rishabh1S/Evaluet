import React from 'react'
import { YStack, XStack, Text, Circle, Card } from "tamagui";
import { LinearGradient } from "expo-linear-gradient";
import {
  MessageCircle
} from "@tamagui/lucide-icons";

const InterviewHeader = ({ 
  timeLabel, 
  status 
}: { 
  timeLabel: string;
  status: string;
}) => {
  const getStatusColor = () => {
      if (status.includes("Connected")) return "#22c55e";
      if (status.includes("Listening")) return "#818cf8";
      if (status.includes("error")) return "#ef4444";
      return "#94a3b8";
    };
  
    return (
      <LinearGradient
        colors={["rgba(15,23,42,0.98)", "rgba(30,41,59,0.95)"]}
        style={{ paddingTop: 20, paddingBottom: 20, paddingHorizontal: 24 }}
      >
        <YStack gap="$3">
          <XStack justify="space-between" items="center">
            <XStack gap="$3" items="center">
              <Circle size={40} bg="rgba(99,102,241,0.15)">
                <MessageCircle size={20} color="#818cf8" />
              </Circle>
              <Text color="white" fontSize={20} fontWeight="700">
                Live Interview
              </Text>
            </XStack>
  
            <Card bg="rgba(0,0,0,0.3)" p="$2">
              <Text color="#60a5fa" fontSize={14} fontWeight="700">
                {timeLabel}
              </Text>
            </Card>
          </XStack>
  
          {/* Status Bar */}
          <XStack 
            gap="$2" 
            items="center" 
            bg="rgba(0,0,0,0.3)" 
            px="$3" 
            py="$2.5"
            borderRadius="$4"
          >
            <Circle size={8} bg={getStatusColor()} />
            <Text color={getStatusColor()} fontSize={13} fontWeight="600">
              {status}
            </Text>
          </XStack>
        </YStack>
      </LinearGradient>
    );
}

export default InterviewHeader