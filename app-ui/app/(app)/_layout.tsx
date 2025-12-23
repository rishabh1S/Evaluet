import { Stack, Redirect } from "expo-router"
import { useEffect, useState } from "react"
import { getValidToken } from "../../lib/auth"
import { YStack, Spinner, useTheme } from "tamagui"

export default function AppLayout() {
  const [checking, setChecking] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const theme = useTheme()

  useEffect(() => {
    let mounted = true

    getValidToken().then(token => {
      if (!mounted) return
      setAuthenticated(!!token)
      setChecking(false)
    })

    return () => {
      mounted = false
    }
  }, [])

  if (checking) {
    return (
      <YStack flex={1} justify="center" items="center">
        <Spinner size="large" />
      </YStack>
    )
  }

  if (!authenticated) {
    return <Redirect href="/(auth)/login" />
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background.val },
        headerTitleStyle: { color: theme.color.val },
        headerTintColor: theme.color.val,
        contentStyle: { backgroundColor: theme.background.val },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="interview/[sessionId]"
        options={{ headerShown: false, gestureEnabled: false }}
      />
    </Stack>
  )
}
