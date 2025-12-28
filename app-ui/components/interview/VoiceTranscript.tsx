import React from "react";
import { Text, YStack, ScrollView } from "tamagui";

type Props = {
  sentence: string;
};

const VoiceTranscript: React.FC<Props> = ({ sentence }) => {

  return (
    <YStack flex={1}>
      <ScrollView
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingVertical: 4,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          color="$accent5"
          fontSize="$5"
          lineHeight="$1"
          fontWeight="500"
          textAlign="justify"
        >
          {sentence || " "}
        </Text>
      </ScrollView>
    </YStack>
  );
};

export default VoiceTranscript;
