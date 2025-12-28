import React, { useEffect, useRef } from "react";
import { ScrollView } from "react-native";
import { Text, YStack } from "tamagui";

type Props = {
  text: string;
};

const VoiceTranscript: React.FC<Props> = ({ text }) => {
  const scrollRef = useRef<ScrollView>(null);

  // Auto-scroll to bottom when new text arrives
  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [text]);

  return (
    <YStack flex={1}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 8,
        }}
      >
        <Text
          color="#e5e7eb"
          fontSize={16}
          lineHeight={22}
          fontWeight="500"
        >
          {text || " "}
        </Text>
      </ScrollView>
    </YStack>
  );
};

export default VoiceTranscript;
