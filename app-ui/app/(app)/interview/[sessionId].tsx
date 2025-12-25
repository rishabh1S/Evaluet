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
import { Audio } from "expo-av";
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
  const currentSound = useRef<Audio.Sound | null>(null);
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
  const assistantSpeakingRef = useRef(false);
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
          stopRecordingSafe();
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
    return () => {
      if (currentSound.current) {
        currentSound.current.unloadAsync();
      }
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
        const chunks = audioBufferRef.current.splice(0, 4);
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

  function playMergedPcm(pcmData: Uint8Array): Promise<void> {
    return new Promise((resolve) => {
      playMergedPcmInternal(pcmData, resolve);
    });
  }

  async function playMergedPcmInternal(
    pcmData: Uint8Array,
    resolve: () => void
  ) {
    try {
      assistantSpeakingRef.current = true;
      await stopRecordingSafe();

      const wavData = pcmToWav(pcmData);
      const base64 = Buffer.from(wavData).toString("base64");
      const sound = new Audio.Sound();
      currentSound.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          resolve();
        }
      });

      await sound.loadAsync(
        { uri: `data:audio/wav;base64,${base64}` },
        { shouldPlay: true }
      );
    } catch (e) {
      console.error("TTS playback error:", e);
      assistantSpeakingRef.current = false;
      resolve();
    }
  }

  function pcmToWav(pcmData: Uint8Array) {
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;

    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const buffer = new ArrayBuffer(44 + pcmData.length);
    const view = new DataView(buffer);

    let offset = 0;

    function writeString(s: string) {
      for (let i = 0; i < s.length; i++) {
        view.setUint8(offset++, s.charCodeAt(i));
      }
    }

    writeString("RIFF");
    view.setUint32(offset, 36 + pcmData.length, true);
    offset += 4;
    writeString("WAVE");
    writeString("fmt ");
    view.setUint32(offset, 16, true);
    offset += 4;
    view.setUint16(offset, 1, true);
    offset += 2;
    view.setUint16(offset, numChannels, true);
    offset += 2;
    view.setUint32(offset, sampleRate, true);
    offset += 4;
    view.setUint32(offset, byteRate, true);
    offset += 4;
    view.setUint16(offset, blockAlign, true);
    offset += 2;
    view.setUint16(offset, bitsPerSample, true);
    offset += 2;
    writeString("data");
    view.setUint32(offset, pcmData.length, true);
    offset += 4;

    new Uint8Array(buffer, 44).set(pcmData);
    return new Uint8Array(buffer);
  }

  function endInterview() {
    interviewEndedRef.current = true;
    ws.current?.send(
      JSON.stringify({ type: "control", action: "END_INTERVIEW" })
    );
    ws.current?.close();
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
