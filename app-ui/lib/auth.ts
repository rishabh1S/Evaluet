import * as SecureStore from "expo-secure-store"
import { jwtDecode } from "jwt-decode"

const TOKEN_KEY = "access_token"

export async function setToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token)
}

export async function getValidToken() {
  const token = await SecureStore.getItemAsync(TOKEN_KEY)
  if (!token) return null

  try {
    const decoded: any = jwtDecode(token)
    if (!decoded.exp) return null

    const now = Date.now() / 1000
    if (decoded.exp < now) {
      await SecureStore.deleteItemAsync(TOKEN_KEY)
      return null
    }

    return token
  } catch {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
    return null
  }
}

export async function clearToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY)
}

export async function authFetch(url: string, options: any = {}) {
  const token = await getValidToken()
  if (!token) {
    throw new Error("Not authenticated")
  }

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  })
}
