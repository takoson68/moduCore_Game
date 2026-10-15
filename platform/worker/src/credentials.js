const encoder = new TextEncoder()
const ITERATIONS = 600000
const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
const fromHex = value => Uint8Array.from(value.match(/../g), b => parseInt(b, 16))

export function randomToken() {
  return hex(crypto.getRandomValues(new Uint8Array(32)))
}

export async function digestToken(token) {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(token))))
}

async function derive(password, salt) {
  // 使用 Workers 的原生 Node.js crypto，保持既有 PBKDF2 格式與強度。
  return new Promise((resolve, reject) => {
    pbkdf2(password, salt, ITERATIONS, 32, 'sha256', (error, key) => {
      if (error) reject(error)
      else resolve(new Uint8Array(key))
    })
  })
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return `pbkdf2-sha256$${ITERATIONS}$${hex(salt)}$${hex(await derive(password, salt))}`
}

export async function verifyPassword(password, encoded) {
  const match = /^pbkdf2-sha256\$600000\$([a-f0-9]{32})\$([a-f0-9]{64})$/.exec(encoded ?? '')
  // 無帳戶或不合法格式時仍做同等 KDF，避免直接略過密碼運算。
  const actual = await derive(password, match ? fromHex(match[1]) : new Uint8Array(16))
  const expected = match ? fromHex(match[2]) : new Uint8Array(32)
  let difference = 0
  for (let i = 0; i < actual.length; i++) difference |= actual[i] ^ expected[i]
  return match !== null && difference === 0
}
import { pbkdf2 } from 'node:crypto'

