import { YStack, XStack, Input, Button, Text, H2, Card } from "tamagui";
import { useState } from "react";
import { useRouter } from "expo-router";
import { API_BASE } from "../../lib/env";
import { setToken } from "../../lib/auth";
import { LinearGradient } from "expo-linear-gradient";
import { Brain } from "@tamagui/lucide-icons";
import { KeyboardAvoidingView, Platform } from "react-native";
import { cardStyle, inputStyle } from "components/authStyles";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const login = async () => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      alert("Invalid credentials");
      return;
    }

    const { access_token } = await res.json();
    await setToken(access_token);
    router.replace("/");
  };

  return (
    <LinearGradient
      colors={["#0B1220", "#0F172A", "#111827"]}
      style={{ flex: 1 }}
    >
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <YStack flex={1} justify="center" px="$6">
        {/* Branding */}
        <YStack items="center" mb="$6" gap="$2">
          <Brain size={38} color="white" />
          <H2 color="white">Evaluet</H2>
          <Text color="rgba(255,255,255,0.6)">
            AI-powered interview practice
          </Text>
        </YStack>

        {/* Card */}
        <Card {...cardStyle}>
          <YStack gap="$4">
            <Text fontSize={18} fontWeight="700" color="white">
              Login
            </Text>

            <Input
              placeholder="Email"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              {...inputStyle}
            />
            <Input
              placeholder="Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              {...inputStyle}
            />

            <Button
              onPress={login}
              height={52}
              bg="#2563EB"
              pressStyle={{ bg: "#1D4ED8" }}
            >
              <Text color="white" fontWeight="700">
                Continue
              </Text>
            </Button>
          </YStack>
        </Card>

        {/* Footer */}
        <XStack justify="center" mt="$5">
          <Text
            color="rgba(255,255,255,0.8)"
            onPress={() => router.push("../register")}
          >
            New here?{" "}
            <Text color="white" fontWeight="700">
              Create account
            </Text>
          </Text>
        </XStack>
      </YStack>
    </KeyboardAvoidingView>
    </LinearGradient>
  );
}
