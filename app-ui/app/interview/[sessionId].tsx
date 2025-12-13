import { useLocalSearchParams, Stack } from 'expo-router'
import { YStack, XStack, Button, Text, ScrollView, Card } from 'tamagui'
import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system'
import { useEffect, useRef, useState } from 'react'
import { Buffer } from 'buffer'
import { useKeepAwake } from 'expo-keep-awake'
import { LinearGradient } from 'expo-linear-gradient'
import { WS_BASE } from '../../lib/env'
import { Mic, Square, Clock, MessageCircle, User, Bot } from '@tamagui/lucide-icons'

interface Message {
  id: string
  text: string
  role?: 'user' | 'assistant'
}

// Extracted Header Component
function InterviewHeader({ timeLabel }: { timeLabel: string }) {
  return (
    <LinearGradient
      colors={['rgba(15,23,42,0.95)', 'rgba(30,41,59,0.9)']}
      style={{
        paddingTop: 50,
        paddingBottom: 16,
        paddingHorizontal: 20
      }}
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
  )
}

// Extracted Message Bubble Component
function MessageBubble({ message }: { message: Message }) {
  // Parse role from text if not provided (backward compatibility)
  let role = message.role
  let text = message.text
  
  if (!role && message.text.includes(':')) {
    const [roleText, ...rest] = message.text.split(':')
    role = roleText.toLowerCase().includes('user') ? 'user' : 'assistant'
    text = rest.join(':').trim()
  }
  
  const isUser = role === 'user'
  
  return (
    <XStack
      justify={isUser ? 'flex-end' : 'flex-start'}
      mb="$3"
    >
      <XStack
        maxW="85%"
        gap="$2"
        flexDirection={isUser ? 'row-reverse' : 'row'}
        items="flex-start"
      >
        {/* Avatar */}
        <YStack
          bg={isUser ? 'rgba(99,102,241,0.2)' : 'rgba(34,197,94,0.2)'}
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

        {/* Message Card */}
        <Card
          bg={isUser ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.08)'}
          bordered
          borderColor={isUser ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.1)'}
          p="$3"
          elevate
        >
          <Text color="white" fontSize={15} lineHeight={22}>
            {text}
          </Text>
        </Card>
      </XStack>
    </XStack>
  )
}

// Mitemsn Interview Screen
export default function InterviewScreen() {
  const { sessionId } = useLocalSearchParams()
  const ws = useRef<WebSocket | null>(null)
  const recording = useRef<Audio.Recording | null>(null)
  const sentBytes = useRef(0)
  const streamInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  const [messages, setMessages] = useState<Message[]>([])
  const [status, setStatus] = useState('Connecting…')
  const [seconds, setSeconds] = useState(0)
  const [isRecording, setIsRecording] = useState(false)

  // 🚫 Disable screen sleep
  useKeepAwake()

  // ⏱ Interview timer
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const timeLabel = `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`

  // WebSocket connection
  useEffect(() => {
    ws.current = new WebSocket(`${WS_BASE}/ws/interview/${sessionId}`)
    ws.current.binaryType = 'arraybuffer'

    ws.current.onopen = () => setStatus('Connected')
    
    ws.current.onmessage = async (e) => {
      if (typeof e.data === 'string') {
        const msg = JSON.parse(e.data)
        if (msg.type === 'transcript') {
          setMessages((m) => [
            ...m,
            { 
              id: crypto.randomUUID(), 
              text: msg.content,
              role: msg.role
            }
          ])
        }
      } else {
        // Play audio response
        const base64 = Buffer.from(e.data).toString('base64')
        const sound = new Audio.Sound()
        await sound.loadAsync({ uri: `data:audio/wav;base64,${base64}` })
        await sound.playAsync()
      }
    }

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error)
      setStatus('Connection error')
    }

    ws.current.onclose = () => {
      setStatus('Disconnected')
    }

    return () => {
      ws.current?.close()
      if (streamInterval.current) clearInterval(streamInterval.current)
    }
  }, [sessionId])

  async function startStreaming() {
    try {
      await Audio.requestPermissionsAsync()
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true
      })

      recording.current = new Audio.Recording()
      await recording.current.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.LOW_QUALITY
      )
      await recording.current.startAsync()
      setStatus('🎤 Listening…')
      setIsRecording(true)

      // Stream audio chunks to WebSocket
      streamInterval.current = setInterval(async () => {
        if (!recording.current || !ws.current) return

        const uri = recording.current.getURI()
        if (!uri) return

        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: 'base64'
        })
        const buffer = Buffer.from(base64, 'base64')

        // Skip WAV header on first chunk, then send only new data
        const pcm = buffer.slice(sentBytes.current === 0 ? 44 : sentBytes.current)
        sentBytes.current = buffer.length

        if (pcm.length > 0) ws.current.send(pcm)
      }, 40) // Send chunks every 40ms
    } catch (error) {
      console.error('Fitemsled to start recording:', error)
      setStatus('❌ Recording fitemsled')
      setIsRecording(false)
    }
  }

  async function stopStreaming() {
    try {
      if (streamInterval.current) {
        clearInterval(streamInterval.current)
        streamInterval.current = null
      }

      if (recording.current) {
        await recording.current.stopAndUnloadAsync()
        recording.current = null
      }

      sentBytes.current = 0
      setStatus('Processing…')
      setIsRecording(false)
    } catch (error) {
      console.error('Fitemsled to stop recording:', error)
      setStatus('❌ Error stopping')
      setIsRecording(false)
    }
  }

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b']}
      style={{ flex: 1 }}
    >
      <Stack.Screen
        options={{
          header: () => <InterviewHeader timeLabel={timeLabel} />
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
          <Text color="rgba(255,255,255,0.7)" fontSize={14} text="center">
            {status}
          </Text>
        </Card>

        {/* Messages ScrollView */}
        <ScrollView
          flex={1}
          showsVerticalScrollIndicator={false}
        >
          <YStack py="$2">
            {messages.length === 0 ? (
              <YStack items="center" justify="center" pt="$8" gap="$3">
                <YStack bg="rgba(99,102,241,0.1)" p="$5">
                  <MessageCircle size={48} color="#818cf8" />
                </YStack>
                <Text
                  color="rgba(255,255,255,0.6)"
                  fontSize={16}
                  text="center"
                >
                  Your conversation will appear here
                </Text>
              </YStack>
            ) : (
              messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))
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
              onPress={startStreaming}
              disabled={isRecording}
              bg={isRecording ? 'rgba(255,255,255,0.1)' : 'rgba(99,102,241,0.2)'}
              borderColor={isRecording ? 'rgba(255,255,255,0.2)' : '#818cf8'}
              borderWidth={2}
              flex={1}
              height={60}
              pressStyle={{
                scale: 0.95,
                bg: 'rgba(99,102,241,0.3)'
              }}
              opacity={isRecording ? 0.5 : 1}
            >
              <XStack gap="$2" items="center">
                <Mic size={24} color={isRecording ? 'rgba(255,255,255,0.4)' : '#818cf8'} />
                <Text
                  color={isRecording ? 'rgba(255,255,255,0.4)' : 'white'}
                  fontSize={16}
                  fontWeight="700"
                >
                  Speak
                </Text>
              </XStack>
            </Button>

            <Button
              onPress={stopStreaming}
              disabled={!isRecording}
              bg={isRecording ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)'}
              borderColor={isRecording ? '#ef4444' : 'rgba(255,255,255,0.2)'}
              borderWidth={2}
              flex={1}
              height={60}
              pressStyle={{
                scale: 0.95,
                bg: 'rgba(239,68,68,0.3)'
              }}
              opacity={isRecording ? 1 : 0.5}
            >
              <XStack gap="$2" items="center">
                <Square size={24} color={isRecording ? '#ef4444' : 'rgba(255,255,255,0.4)'} />
                <Text
                  color={isRecording ? 'white' : 'rgba(255,255,255,0.4)'}
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
  )
}