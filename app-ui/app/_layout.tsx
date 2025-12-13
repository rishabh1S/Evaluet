import 'react-native-reanimated'
import '../tamagui-web.css'

import { useEffect } from 'react'
import { useColorScheme } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { useFonts } from 'expo-font'
import { SplashScreen, Stack } from 'expo-router'
import { Provider } from 'components/Provider'
import { useTheme } from 'tamagui'
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Buffer } from "buffer"

global.Buffer = Buffer

// Catch any errors thrown by the Layout component.
export { ErrorBoundary } from 'expo-router'

// Prevent splash from auto-hiding until fonts are loaded
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const colorScheme = useColorScheme()

  const [fontsLoaded, fontError] = useFonts({
    Inter: require('@tamagui/font-inter/otf/Inter-Medium.otf'),
    InterBold: require('@tamagui/font-inter/otf/Inter-Bold.otf'),
  })

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded, fontError])

  if (!fontsLoaded && !fontError) {
    return null
  }

  return (
    <Provider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <GestureHandlerRootView style={{ flex: 1 }}>
        <RootStack />
        </GestureHandlerRootView>
      </ThemeProvider>
    </Provider>
  )
}

function RootStack() {
  const theme = useTheme()

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.background.val,
        },
        headerTitleStyle: {
          color: theme.color.val,
        },
        headerTintColor: theme.color.val,
        contentStyle: {
          backgroundColor: theme.background.val,
        },
      }}
    >
      {/* Setup Screen */}
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />

      {/* Interview Screen */}
      <Stack.Screen
        name="interview/[sessionId]"
        options={{
          headerShown: false,
          gestureEnabled: false, // avoid accidental back during interview
        }}
      />

      {/* Optional future modal */}
      <Stack.Screen
        name="modal"
        options={{
          presentation: 'modal',
          title: 'Modal',
        }}
      />
    </Stack>
  )
}
