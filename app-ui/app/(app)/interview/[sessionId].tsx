import { useLocalSearchParams } from "expo-router";
import { YStack } from "tamagui";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useRef, useState } from "react";
import { useKeepAwake } from "expo-keep-awake";
import { LinearGradient } from "expo-linear-gradient";
import { WS_BASE } from "../../../lib/env";
import { Audio } from "expo-av";
import {
  AudioRecorderProvider,
  useSharedAudioRecorder,
} from "@siteed/expo-audio-studio";
import { useInterviewerStore } from "lib/store/interviewerStore";
import { BottomControls, TopBar, VoiceTranscript } from "components/interview";
import { mergeUint8Arrays, pcmToWav } from "lib/utils/audioUtils";
import {
  InterviewerVideoStage,
  InterviewerVideoStageRef,
} from "components/interview/InterviewerVideoStage";

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
  const [currentSentence, setCurrentSentence] = useState("");
  const [speakerOn, setSpeakerOn] = useState(true);
  const currentSound = useRef<Audio.Sound | null>(null);
  const { sessionId } = useLocalSearchParams();
  const ws = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState("Connecting…");
  const [seconds, setSeconds] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const micStartedRef = useRef(false);
  const interviewEndedRef = useRef(false);
  const audioBufferRef = useRef<Uint8Array[]>([]);
  const playLockRef = useRef<Promise<void> | null>(null);
  const assistantSpeakingRef = useRef(false);
  const clearInterviewer = useInterviewerStore((s) => s.clear);
  const interviewer = useInterviewerStore((s) => s.interviewer);
  const videoStageRef = useRef<InterviewerVideoStageRef>(null);

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

        if (msg.type === "transcript" && msg.role === "assistant") {
          setCurrentSentence(msg.content);
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
      videoStageRef.current?.startTalking();
      await stopRecordingSafe();

      const wavData = pcmToWav(pcmData);
      const base64 = Buffer.from(wavData).toString("base64");
      const sound = new Audio.Sound();
      currentSound.current = sound;

      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          assistantSpeakingRef.current = false;
          videoStageRef.current?.stopTalking();

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
      colors={["#022c22", "#0f172a", "#111827"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0.8 }}
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
              <InterviewerVideoStage
                ref={videoStageRef}
                idleVideoUrl={interviewer?.idle_video_url!}
                talkingVideoUrl={interviewer?.talking_video_url!}
              />
            </YStack>
          </YStack>

          {/* Voice Transcript - 14% */}
          <YStack height="14%" px="$4" justify="center" zIndex={999}>
            <VoiceTranscript sentence={currentSentence} />
          </YStack>

          {/* Bottom Controls - 11% */}
          <YStack height="11%" justify="center">
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
