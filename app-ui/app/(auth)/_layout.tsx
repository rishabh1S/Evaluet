import { Stack } from "expo-router";
import { useTheme } from "tamagui";

export default function AuthLayout() {
  const theme = useTheme();
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
      {/* Login Screen */}
      <Stack.Screen
        name="login"
        options={{
          headerShown: false,
        }}
      />

      {/* Signup Screen */}
      <Stack.Screen
        name="register"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
