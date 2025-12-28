import { useLocalSearchParams } from "expo-router";
import { YStack } from "tamagui";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useRef, useState } from "react";
import { useKeepAwake } from "expo-keep-awake";
import { LinearGradient } from "expo-linear-gradient";
import { WS_BASE } from "../../../lib/env";
import { Audio, Video, ResizeMode } from "expo-av";
import {
  AudioRecorderProvider,
  useSharedAudioRecorder,
} from "@siteed/expo-audio-studio";
import { useInterviewerStore } from "lib/store/interviewerStore";
import { BottomControls, TopBar, VoiceTranscript } from "components/interview";

type SubtitleLine = {
  id: string;
  text: string;
};

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
  const [transcript, setTranscript] = useState("");
  const [speakerOn, setSpeakerOn] = useState(true);
  const currentSound = useRef<Audio.Sound | null>(null);
  const { sessionId } = useLocalSearchParams();
  const ws = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState("Connecting…");
  const [seconds, setSeconds] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const micStartedRef = useRef(false);
  const videoRef = useRef<Video | null>(null);
  const interviewEndedRef = useRef(false);
  const audioBufferRef = useRef<Uint8Array[]>([]);
  const playLockRef = useRef<Promise<void> | null>(null);
  const assistantSpeakingRef = useRef(false);
  const clearInterviewer = useInterviewerStore((s) => s.clear);
  const interviewerIdleVideo = require("../../../assets/videos/idle_1.mp4");

  useKeepAwake();

  const { startRecording, stopRecording } = useSharedAudioRecorder();

  useEffect(() => {
    if (!isRecording || interviewEndedRef.current) return;

    const t = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);

    return () => clearInterval(t);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      videoRef.current?.stopAsync().catch(() => {});
    };
  }, []);

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

        if (msg.type === "transcript" && msg.role === "assistant") {
          setTranscript((prev) =>
            prev ? `${prev}\n${msg.content}` : msg.content
          );
        }

        if (msg.type === "control" && msg.action === "END_INTERVIEW") {
          interviewEndedRef.current = true;
          setStatus("Interview completed");
          clearInterviewer();
          stopRecordingSafe();
          setIsRecording(false);
          return;
        }
      }

      if (!interviewEndedRef.current && e.data instanceof ArrayBuffer) {
        enqueueAudio(e.data);
      }
    };

    ws.current.onerror = () => setStatus("Connection error");
    ws.current.onclose = () => {
      if (!interviewEndedRef.current) {
        setStatus("Disconnected");
      }
    };

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
        if (
          !ws.current ||
          interviewEndedRef.current ||
          assistantSpeakingRef.current
        ) {
          return;
        }

        const bytes = Buffer.from(event.data as string, "base64");
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
      if (!speakerOn) {
        assistantSpeakingRef.current = false;
        resolve();
        return;
      }

      assistantSpeakingRef.current = true;
      await stopRecordingSafe();

      const wavData = pcmToWav(pcmData);
      const base64 = Buffer.from(wavData).toString("base64");
      const sound = new Audio.Sound();
      currentSound.current = sound;

      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          assistantSpeakingRef.current = false;

          if (!interviewEndedRef.current) {
            setTimeout(() => startRecordingSafe().catch(() => {}), 120);
          }

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
    clearInterviewer();
    ws.current?.send(
      JSON.stringify({ type: "control", action: "END_INTERVIEW" })
    );
    ws.current?.close();
  }

  return (
    <LinearGradient
      colors={["#020617", "#0b1220", "#111827"]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <YStack flex={1}>
          {/* Header - 10% */}
          <YStack height="10%" justify="center">
            <TopBar timeLabel={timeLabel} status={status} />
          </YStack>

          {/* Video - 63% */}
          <YStack height="65%" justify="center" alignItems="center" px="$2.5">
            <YStack
              width="100%"
              height="100%"
              maxWidth={420}
              bg="#020617"
              borderColor="rgba(255,255,255,0.06)"
              borderWidth={1}
              borderRadius="$8"
              overflow="hidden"
              shadowColor="black"
              shadowOpacity={0.55}
              shadowRadius={28}
              elevation={12}
            >
              <Video
                ref={videoRef}
                source={interviewerIdleVideo}
                style={{ width: "100%", height: "100%" }}
                resizeMode={ResizeMode.COVER}
                shouldPlay
                isLooping
                isMuted
                progressUpdateIntervalMillis={500}
                useNativeControls={false}
                rate={1}
                volume={20}
                onError={(e) => console.warn("Video error:", e)}
              />
            </YStack>
          </YStack>

          {/* Voice Transcript - 15% */}
          <YStack height="13%" px="$4" justify="center" zIndex={999}>
            <VoiceTranscript text={transcript} />
          </YStack>

          {/* Bottom Controls - 12% */}
          <YStack height="12%" justify="center">
            <BottomControls
              isRecording={isRecording}
              onMicToggle={() =>
                isRecording ? stopRecordingSafe() : startRecordingSafe()
              }
              onEnd={endInterview}
              speakerOn={speakerOn}
              onSpeakerToggle={() => setSpeakerOn((s) => !s)}
            />
          </YStack>
        </YStack>
      </SafeAreaView>
    </LinearGradient>
  );
}
