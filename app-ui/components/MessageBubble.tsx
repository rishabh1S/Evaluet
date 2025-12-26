import React from "react";
import { Bot, User } from "@tamagui/lucide-icons";
import { Card, XStack, Text, Avatar } from "tamagui";
import { useInterviewerStore } from "lib/store/interviewerStore";

export interface Message {
  id: string;
  text: string;
  role?: "user" | "assistant";
}

const MessageBubble = ({ message }: { message: Message }) => {
  const isUser = message.role === "user";
  const interviewer = useInterviewerStore((s) => s.interviewer);

  return (
    <XStack justify={isUser ? "flex-end" : "flex-start"} mb="$3">
      <XStack
        maxW="85%"
        gap="$2"
        flexDirection={isUser ? "row-reverse" : "row"}
      >
        {isUser ? (
          <Avatar circular size="$3" bg="rgba(99,102,241,0.2)">
            <Avatar.Fallback
              items="center"
              justify="center"
            >
              <User size={18} color="#818cf8" />
            </Avatar.Fallback>
          </Avatar>
        ) : (
          <Avatar circular size="$3" bg="rgba(34,197,94,0.2)">
            {interviewer?.profile_image_url && (
              <Avatar.Image src={interviewer.profile_image_url} />
            )}

            <Avatar.Fallback
              items="center"
              justify="center"              
            >
              <Bot size={18} color="#22c55e" />
            </Avatar.Fallback>
          </Avatar>
        )}

        <Card
          bg={isUser ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.08)"}
          bordered
          p="$2"
        >
          <Text color="white">{message.text}</Text>
        </Card>
      </XStack>
    </XStack>
  );
};

export default MessageBubble;
