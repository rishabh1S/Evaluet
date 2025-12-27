import { Card, YStack, View } from "tamagui";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";

const AnimatedView = Animated.createAnimatedComponent(View);

export function InterviewerSkeleton() {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 800 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Card
      p="$3"
      bg="rgba(255,255,255,0.05)"
      borderColor="rgba(255,255,255,0.15)"
      borderWidth={1}
    >
      <YStack gap="$2" items="center">
        {/* Avatar skeleton */}
        <AnimatedView
          style={[
            {
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: "rgba(255,255,255,0.2)",
            },
            animatedStyle,
          ]}
        />

        {/* Name skeleton */}
        <AnimatedView
          style={[
            {
              width: 60,
              height: 12,
              borderRadius: 6,
              backgroundColor: "rgba(255,255,255,0.2)",
            },
            animatedStyle,
          ]}
        />
      </YStack>
    </Card>
  );
}
