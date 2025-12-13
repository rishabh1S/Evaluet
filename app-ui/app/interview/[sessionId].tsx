import { useLocalSearchParams, Stack } from "expo-router";
import { YStack, XStack, Button, Text, ScrollView, Card } from "tamagui";
import { useEffect, useRef, useState } from "react";
import { useKeepAwake } from "expo-keep-awake";
import { LinearGradient } from "expo-linear-gradient";
import { WS_BASE } from "../../lib/env";
import * as Crypto from "expo-crypto";
import {
  Mic,
  Square,
  Clock,
  MessageCircle,
  User,
  Bot,
} from "@tamagui/lucide-icons";
import { Audio } from "expo-av";
import {
  AudioRecorderProvider,
  useSharedAudioRecorder,
} from "@siteed/expo-audio-studio";

interface Message {
  id: string;
  text: string;
  role?: "user" | "assistant";
}

/* ---------------- Header ---------------- */

function InterviewHeader({ timeLabel }: { timeLabel: string }) {
  return (
    <LinearGradient
      colors={["rgba(15,23,42,0.95)", "rgba(30,41,59,0.9)"]}
      style={{ paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20 }}
    >
      <XStack justify="space-between" items="center">
        <XStack gap="$3" items="center">
          <YStack bg="rgba(99,102,241,0.2)" p="$2">
            <MessageCircle size={20} color="#818cf8" />
          </YStack>
          <Text color="white" fontSize={18} fontWeight="700">
            Live Interview
          </Text>
        </XStack>

        <XStack gap="$2" items="center" bg="rgba(0,0,0,0.3)" px="$3" py="$2">
          <Clock size={16} color="#60a5fa" />
          <Text color="#60a5fa" fontSize={15} fontWeight="600">
            {timeLabel}
          </Text>
        </XStack>
      </XStack>
    </LinearGradient>
  );
}

/* ---------------- Message Bubble ---------------- */

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <XStack justify={isUser ? "flex-end" : "flex-start"} mb="$3">
      <XStack maxW="85%" gap="$2" flexDirection={isUser ? "row-reverse" : "row"}>
        <YStack
          bg={isUser ? "rgba(99,102,241,0.2)" : "rgba(34,197,94,0.2)"}
          p="$2"
          width={36}
          height={36}
          items="center"
          justify="center"
        >
          {isUser ? (
            <User size={18} color="#818cf8" />
          ) : (
            <Bot size={18} color="#22c55e" />
          )}
        </YStack>

        <Card
          bg={isUser ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.08)"}
          bordered
          p="$3"
        >
          <Text color="white">{message.text}</Text>
        </Card>
      </XStack>
    </XStack>
  );
}

/* ---------------- Screen Wrapper ---------------- */

export default function InterviewScreenWrapper() {
  return (
    <AudioRecorderProvider>
      <InterviewScreen />
    </AudioRecorderProvider>
  );
}

/* ---------------- Main Screen ---------------- */

function InterviewScreen() {
  let currentSound: Audio.Sound | null = null;
  const { sessionId } = useLocalSearchParams();
  const ws = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState("Connecting…");
  const [seconds, setSeconds] = useState(0);
  const [isRecording, setIsRecording] = useState(false);

  useKeepAwake();

  const { startRecording, stopRecording } = useSharedAudioRecorder();

  /* ---- Timer ---- */
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const timeLabel = `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

  /* ---- WebSocket ---- */
  useEffect(() => {
    ws.current = new WebSocket(`${WS_BASE}/ws/interview/${sessionId}`);
    ws.current.binaryType = "arraybuffer";

    ws.current.onopen = () => setStatus("Connected");

    ws.current.onmessage = async (e) => {
      if (typeof e.data === "string") {
        const msg = JSON.parse(e.data);
        if (msg.type === "transcript") {
          setMessages((m) => [
            ...m,
            {
              id: Crypto.randomUUID(),
              text: msg.content,
              role: msg.role,
            },
          ]);
        }
      }else {
        await playPcmWav(e.data); // Play received audio
      }
    };

    ws.current.onerror = () => setStatus("Connection error");
    ws.current.onclose = () => setStatus("Disconnected");

    return () => ws.current?.close();
  }, [sessionId]);

  /* ---- Controls ---- */
  async function handleStart() {
    await startRecording({
      sampleRate: 16000,
      channels: 1,
      encoding: "pcm_16bit",
      interval: 100, // Send chunks every 100ms
      onAudioStream: async (event) => {
        // Send raw PCM data to WebSocket
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          // event.data is a base64 string by default
          // Convert to Uint8Array for WebSocket
          const base64Data = event.data as string;
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          ws.current.send(bytes);
        }
      },
    });
    setIsRecording(true);
    setStatus("🎤 Listening…");
  }

  async function handleStop() {
    await stopRecording();
    setIsRecording(false);
    setStatus("Processing…");
  }

  async function playPcmWav(buffer: ArrayBuffer) {
    try {
      if (currentSound) {
        await currentSound.unloadAsync();
        currentSound = null;
      }

      const base64 = Buffer.from(buffer).toString("base64");

      const sound = new Audio.Sound();
      await sound.loadAsync({
        uri: `data:audio/wav;base64,${base64}`,
      });

      await sound.playAsync();
      currentSound = sound;
    } catch (e) {
      console.error("Audio playback error:", e);
    }
  }

  return (
    <LinearGradient colors={["#0f172a", "#1e293b"]} style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          header: () => <InterviewHeader timeLabel={timeLabel} />,
        }}
      />

      <YStack flex={1} p="$4" gap="$4">
        {/* Status Banner */}
        <Card
          bg="rgba(0,0,0,0.3)"
          bordered
          borderColor="rgba(255,255,255,0.1)"
          p="$3"
        >
          <Text color="rgba(255,255,255,0.7)" fontSize={14}>
            {status}
          </Text>
        </Card>

        {/* Messages ScrollView */}
        <ScrollView flex={1} showsVerticalScrollIndicator={false}>
          <YStack py="$2">
            {messages.length === 0 ? (
              <YStack items="center" justify="center" pt="$8" gap="$3">
                <YStack bg="rgba(99,102,241,0.1)" p="$5">
                  <MessageCircle size={48} color="#818cf8" />
                </YStack>
                <Text color="rgba(255,255,255,0.6)" fontSize={16} text="center">
                  Your conversation will appear here
                </Text>
              </YStack>
            ) : (
              messages.map((m) => <MessageBubble key={m.id} message={m} />)
            )}
          </YStack>
        </ScrollView>

        {/* Control Buttons */}
        <Card
          bg="rgba(0,0,0,0.4)"
          bordered
          borderColor="rgba(255,255,255,0.1)"
          p="$4"
          elevate
        >
          <XStack gap="$3" justify="center">
            <Button
              onPress={handleStart} 
              disabled={isRecording}
              bg={
                isRecording ? "rgba(255,255,255,0.1)" : "rgba(99,102,241,0.2)"
              }
              borderColor={isRecording ? "rgba(255,255,255,0.2)" : "#818cf8"}
              borderWidth={2}
              flex={1}
              height={60}
              pressStyle={{
                scale: 0.95,
                bg: "rgba(99,102,241,0.3)",
              }}
              opacity={isRecording ? 0.5 : 1}
            >
              <XStack gap="$2" items="center">
                <Mic
                  size={24}
                  color={isRecording ? "rgba(255,255,255,0.4)" : "#818cf8"}
                />
                <Text
                  color={isRecording ? "rgba(255,255,255,0.4)" : "white"}
                  fontSize={16}
                  fontWeight="700"
                >
                  Speak
                </Text>
              </XStack>
            </Button>

            <Button
              onPress={handleStop} 
              disabled={!isRecording}
              bg={isRecording ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.1)"}
              borderColor={isRecording ? "#ef4444" : "rgba(255,255,255,0.2)"}
              borderWidth={2}
              flex={1}
              height={60}
              pressStyle={{
                scale: 0.95,
                bg: "rgba(239,68,68,0.3)",
              }}
              opacity={isRecording ? 1 : 0.5}
            >
              <XStack gap="$2" items="center">
                <Square
                  size={24}
                  color={isRecording ? "#ef4444" : "rgba(255,255,255,0.4)"}
                />
                <Text
                  color={isRecording ? "white" : "rgba(255,255,255,0.4)"}
                  fontSize={16}
                  fontWeight="700"
                >
                  Stop
                </Text>
              </XStack>
            </Button>
          </XStack>
        </Card>
      </YStack>
    </LinearGradient>
  );
}
