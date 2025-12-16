import { useLocalSearchParams } from "expo-router";
import { YStack, Button, Text, ScrollView, Circle } from "tamagui";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useRef, useState } from "react";
import { useKeepAwake } from "expo-keep-awake";
import { LinearGradient } from "expo-linear-gradient";
import { WS_BASE } from "../../lib/env";
import * as Crypto from "expo-crypto";
import { Mic, MessageCircle } from "@tamagui/lucide-icons";
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
  const currentSound = useRef<Audio.Sound | null>(null);
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
      } else {
        await playPcmWav(e.data);
      }
    };

    ws.current.onerror = () => setStatus("Connection error");
    ws.current.onclose = () => setStatus("Disconnected");

    return () => {
      ws.current?.close();
    };
  }, [sessionId]);

  /* ---- Cleanup audio on unmount ---- */
  useEffect(() => {
    return () => {
      if (currentSound.current) {
        currentSound.current.unloadAsync();
      }
    };
  }, []);

  /* ---- Toggle Recording ---- */
  async function toggleRecording() {
    if (isRecording) {
      await stopRecording();
      setIsRecording(false);
      setStatus("Processing…");
    } else {
      await startRecording({
        sampleRate: 16000,
        channels: 1,
        encoding: "pcm_16bit",
        interval: 100,
        onAudioStream: async (event) => {
          if (ws.current && ws.current.readyState === WebSocket.OPEN) {
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
  }

  async function playPcmWav(buffer: ArrayBuffer) {
    try {
      if (currentSound.current) {
        await currentSound.current.unloadAsync();
        currentSound.current = null;
      }

      const uint8Array = new Uint8Array(buffer);
      let binaryString = '';
      for (const element of uint8Array) {
        binaryString += String.fromCharCode(element);
      }
      const base64 = btoa(binaryString);

      const sound = new Audio.Sound();
      await sound.loadAsync({
        uri: `data:audio/wav;base64,${base64}`,
      });

      await sound.playAsync();
      currentSound.current = sound;
    } catch (e) {
      console.error("Audio playback error:", e);
    }
  }

  return (
    <LinearGradient colors={["#0f172a", "#1e293b"]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <InterviewHeader timeLabel={timeLabel} status={status} />
      
        <YStack flex={1} p="$4" gap="$4">
          {/* Messages ScrollView */}
          <ScrollView flex={1} showsVerticalScrollIndicator={false}>
            <YStack py="$2">
              {messages.length === 0 ? (
                <YStack items="center" justify="center" pt="$10" gap="$4">
                  <Circle size={100} bg="rgba(99,102,241,0.1)">
                    <MessageCircle size={48} color="#818cf8" />
                  </Circle>
                  <YStack gap="$2" items="center">
                    <Text 
                      color="rgba(255,255,255,0.9)" 
                      fontSize={18} 
                      fontWeight="600"
                      textAlign="center"
                    >
                      Ready to start
                    </Text>
                    <Text 
                      color="rgba(255,255,255,0.5)" 
                      fontSize={15}
                      textAlign="center"
                    >
                      Tap the microphone to begin speaking
                    </Text>
                  </YStack>
                </YStack>
              ) : (
                messages.map((m) => <MessageBubble key={m.id} message={m} />)
              )}
            </YStack>
          </ScrollView>

          {/* Single Mic Button */}
          <YStack items="center" pb="$2" pt="$-1">
            <Button
              onPress={toggleRecording}
              circular
              size="$8"
              bg={isRecording ? "rgba(241,102,99,0.2)" : "rgba(99,102,241,0.2)"}
              borderColor={isRecording ? "#ef4444" : "#818cf8"}
              borderWidth={3}
              pressStyle={{
                scale: 0.92
              }}
              animation="bouncy"
              style={{
                width: 80,
                height: 80,
                shadowColor: isRecording ? "#472828ff" : "#818cf8",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isRecording ? 0.5 : 0.3,
                shadowRadius: isRecording ? 20 : 12,
              }}
            >
              <Mic 
                size={32} 
                color={isRecording ? "#ef4444" : "#818cf8"}
              />
            </Button>
            
            <Text 
              color={isRecording ? "rgba(255, 50, 50, 0.7)" : "rgba(255,255,255,0.7)"} 
              fontSize={14} 
              fontWeight="600"
              mt="$3"
            >
              {isRecording ? "Tap to stop" : "Tap to speak"}
            </Text>
          </YStack>
        </YStack>
      </SafeAreaView>
    </LinearGradient>
  );
}