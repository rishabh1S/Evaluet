import { Sheet, YStack, Text, Avatar, Button } from "tamagui";
import { X } from "@tamagui/lucide-icons";

export function InterviewerInfoSheet({ interviewer, onClose }: any) {
  return (
    <Sheet
      modal
      open={!!interviewer}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      snapPoints={[70]}
      dismissOnSnapToBottom
      animation="medium"
      zIndex={100_000}
    >
      <Sheet.Overlay
        bg="$shadow6"
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
      />

      <Sheet.Handle />

      <Sheet.Frame p="$5" gap="$4">
        {interviewer && (
          <>
            {/* Close button */}
            <Button
              size="$3"
              circular
              alignSelf="flex-end"
              onPress={() => onClose()}
              chromeless
            >
              <X size={16} />
            </Button>

            <YStack gap="$4" items="center">
              <Avatar circular size="$15">
                <Avatar.Image src={interviewer.profile_image_url} />
                <Avatar.Fallback
                  backgroundColor="$black9"
                  items="center"
                  justify="center"
                >
                  <Text fontWeight="700" fontSize="$8">{interviewer.name.charAt(0)}</Text>
                </Avatar.Fallback>
              </Avatar>

              <Text fontSize="$8" fontWeight="700">
                {interviewer.name}
              </Text>

              {interviewer.description && (
                <Text textAlign="center" opacity={0.8}>
                  {interviewer.description}
                </Text>
              )}

              {interviewer.focus_areas && (
                <YStack gap="$2" items="center">
                  <Text fontWeight="600">Focus Areas</Text>
                  <Text opacity={0.7} textAlign="center">
                    {interviewer.focus_areas}
                  </Text>
                </YStack>
              )}
            </YStack>
          </>
        )}
      </Sheet.Frame>
    </Sheet>
  );
}
