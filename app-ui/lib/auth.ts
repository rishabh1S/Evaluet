import * as SecureStore from "expo-secure-store"

const TOKEN_KEY = "access_token"

export async function setToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token)
}

export async function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY)
}

export async function clearToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY)
}

export async function authFetch(url: string, options: any = {}) {
  const token = await getToken()

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  })
}
