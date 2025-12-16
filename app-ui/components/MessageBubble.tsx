import React from 'react'
import { Bot, User } from '@tamagui/lucide-icons';
import { Card, XStack, Text } from 'tamagui';

export interface Message {
  id: string;
  text: string;
  role?: "user" | "assistant";
}

const MessageBubble = ({ message }: { message: Message }) => {
  const isUser = message.role === "user";
  
    return (
      <XStack justify={isUser ? "flex-end" : "flex-start"} mb="$3">
        <XStack maxW="85%" gap="$2" flexDirection={isUser ? "row-reverse" : "row"}>
          <Card
            bg={isUser ? "rgba(99,102,241,0.2)" : "rgba(34,197,94,0.2)"}
            p="$2"
            width={36}
            height={36}
            items="center"
            justify="center"
            bordered
          >
            {isUser ? (
              <User size={18} color="#818cf8" />
            ) : (
              <Bot size={18} color="#22c55e" />
            )}
          </Card>
  
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
}

export default MessageBubble