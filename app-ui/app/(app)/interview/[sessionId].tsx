import { useLocalSearchParams, useRouter } from "expo-router";
import { YStack, Button, Text } from "tamagui";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlatList } from "react-native";
import { useEffect, useRef, useState } from "react";
import { useKeepAwake } from "expo-keep-awake";
import { LinearGradient } from "expo-linear-gradient";
import { WS_BASE } from "../../../lib/env";
import * as Crypto from "expo-crypto";
import { Mic } from "@tamagui/lucide-icons";
import { createAudioPlayer } from "expo-audio";
import {
  AudioRecorderProvider,
  useSharedAudioRecorder,
} from "@siteed/expo-audio-studio";
import MessageBubble, { Message } from "components/MessageBubble";
import InterviewHeader from "components/InterviewHeader";

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
  const router = useRouter();
  const { sessionId } = useLocalSearchParams();
  const ws = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState("Connecting…");
  const [seconds, setSeconds] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const micStartedRef = useRef(false);
  const interviewEndedRef = useRef(false);
  const audioBufferRef = useRef<Uint8Array[]>([]);
  const playLockRef = useRef<Promise<void> | null>(null);
  const audioPlayerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(
    null
  );
  const listRef = useRef<FlatList<Message>>(null);

  useKeepAwake();

  const { startRecording, stopRecording } = useSharedAudioRecorder();

  useEffect(() => {
    if (!isRecording || interviewEndedRef.current) return;

    const t = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);

    return () => clearInterval(t);
  }, [isRecording]);

  const timeLabel = `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

  useEffect(() => {
    ws.current = new WebSocket(`${WS_BASE}/ws/interview/${sessionId}`);
    ws.current.binaryType = "arraybuffer";

    ws.current.onopen = async () => {
      setStatus("Connected");

      if (!micStartedRef.current) {
        try {
          await startRecordingSafe();
          micStartedRef.current = true;
        } catch (e) {
          console.warn("Mic start blocked until user tap", e);
        }
      }
    };

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
        if (
          msg.role === "assistant" &&
          typeof msg.content === "string" &&
          msg.content.includes("[END_INTERVIEW]") &&
          !interviewEndedRef.current
        ) {
          interviewEndedRef.current = true;
          setStatus("Interview completed");
          setIsRecording(false);

          setTimeout(() => {
            router.replace("/");
          }, 2500);
        }
      }
      if (!interviewEndedRef.current && e.data instanceof ArrayBuffer) {
        enqueueAudio(e.data);
      }
    };

    ws.current.onerror = () => setStatus("Connection error");
    ws.current.onclose = () => setStatus("Disconnected");

    return () => {
      ws.current?.close();
    };
  }, [sessionId]);

  useEffect(() => {
    audioPlayerRef.current = createAudioPlayer();

    return () => {
      audioPlayerRef.current?.remove();
      audioPlayerRef.current = null;
    };
  }, []);

  async function startRecordingSafe() {
    if (isRecording) return;

    await startRecording({
      sampleRate: 16000,
      channels: 1,
      encoding: "pcm_16bit",
      interval: 100,
      onAudioStream: async (event) => {
        if (!ws.current || interviewEndedRef.current) return;

        const base64 = event.data as string;
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        ws.current.send(bytes);
      },
    });

    setIsRecording(true);
  }

  async function stopRecordingSafe() {
    if (!isRecording) return;
    await stopRecording();
    setIsRecording(false);
  }

  function enqueueAudio(buffer: ArrayBuffer) {
    audioBufferRef.current.push(new Uint8Array(buffer));
    flushAndPlay();
  }

  async function flushAndPlay() {
    if (playLockRef.current) return;

    playLockRef.current = (async () => {
      while (audioBufferRef.current.length > 0) {
        const chunks = audioBufferRef.current.length < 3
        ? audioBufferRef.current.splice(0)
        : audioBufferRef.current.splice(0, 4);
        const merged = mergeUint8Arrays(chunks);
        await playMergedPcm(merged);
      }
    })();

    await playLockRef.current;
    playLockRef.current = null;
  }

  function mergeUint8Arrays(chunks: Uint8Array[]) {
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const merged = new Uint8Array(totalLength);

    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    return merged;
  }

  async function playMergedPcm(pcmData: Uint8Array): Promise<void> {
    return new Promise((resolve) => {
      try {
        if (!audioPlayerRef.current) {
          resolve();
          return;
        }

        const base64 = Buffer.from(pcmData).toString("base64");
        const uri = `data:audio/wav;base64,${base64}`;

        const player = audioPlayerRef.current;

        player.replace({ uri });
        player.play();

        const interval = setInterval(() => {
          if (!player.playing) {
            clearInterval(interval);
            resolve();
          }
        }, 40);
      } catch (e) {
        console.error("TTS playback error:", e);
        resolve();
      }
    });
  }

  function endInterview() {
    interviewEndedRef.current = true;
    ws.current?.send(
      JSON.stringify({ type: "CONTROL", action: "END_INTERVIEW" })
    );
    ws.current?.close();
    setTimeout(() => {
      router.replace("/");
    }, 2500);
  }

  return (
    <LinearGradient colors={["#0f172a", "#1e293b"]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <InterviewHeader
          timeLabel={timeLabel}
          status={status}
          onEnd={endInterview}
        />

        <YStack flex={1} p="$4" gap="$4">
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <MessageBubble message={item} />}
            contentContainerStyle={{ paddingVertical: 8 }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              listRef.current?.scrollToEnd({ animated: true });
            }}
          />

          {/* Single Mic Button */}
          <YStack items="center" justify="center" pb="$2" pt="$-1">
            <Button
              onPress={() =>
                isRecording ? stopRecordingSafe() : startRecordingSafe()
              }
              circular
              size="$8"
              bg={isRecording ? "rgba(241,102,99,0.2)" : "rgba(99,102,241,0.2)"}
              borderColor={isRecording ? "#ef4444" : "#818cf8"}
              borderWidth={3}
              pressStyle={{ scale: 0.92 }}
              animation="bouncy"
              style={{
                width: 80,
                height: 80,
              }}
            >
              <Mic size={32} color={isRecording ? "#ef4444" : "#818cf8"} />
            </Button>
            <Text
              fontSize={14}
              fontWeight="600"
              mt="$2"
              color="rgba(255,255,255,0.7)"
            >
              {isRecording ? "Mic on" : "Mic muted"}
            </Text>
          </YStack>
        </YStack>
      </SafeAreaView>
    </LinearGradient>
  );
}
