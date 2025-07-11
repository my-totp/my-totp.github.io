/**
 * Crypto utilities for encrypting/decrypting TOTP account data
 * Uses WebAuthn passkey signatures for key derivation and AES-GCM for encryption
 */

import { deriveKeyFromPasskey } from './webauthn'
import { arrayBufferToBase64, base64ToArrayBuffer } from './encoding'

/**
 * Encrypt data using passkey-derived key
 * @param {string} data - Data to encrypt
 * @param {ArrayBuffer} keyMaterial - Key material from passkey authentication (PRF result or signature)
 * @returns {Promise<string>} Base64 encoded encrypted data with salt and IV
 */
export async function encryptData(data: string, keyMaterial: ArrayBuffer): Promise<string> {
  try {
    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const iv = crypto.getRandomValues(new Uint8Array(12))

    // Derive key from passkey key material
    const key = await deriveKeyFromPasskey(keyMaterial, salt)

    // Encrypt data
    const dataBuffer = new TextEncoder().encode(data)
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      dataBuffer
    )

    // Combine salt, IV, and encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encryptedBuffer.byteLength)
    combined.set(salt, 0)
    combined.set(iv, salt.length)
    combined.set(new Uint8Array(encryptedBuffer), salt.length + iv.length)

    // Return as base64
    return arrayBufferToBase64(combined.buffer)
  } catch (error) {
    console.error('Passkey encryption failed:', error)
    throw new Error('Failed to encrypt data with passkey')
  }
}

/**
 * Decrypt data using passkey-derived key
 * @param {string} encryptedData - Base64 encoded encrypted data
 * @param {ArrayBuffer} keyMaterial - Key material from passkey authentication (PRF result or signature)
 * @returns {Promise<string>} Decrypted data
 */
export async function decryptData(encryptedData: string, keyMaterial: ArrayBuffer): Promise<string> {
  try {
    // Decode from base64
    const combined = new Uint8Array(base64ToArrayBuffer(encryptedData))

    // Extract salt, IV, and encrypted data
    const salt = combined.slice(0, 16)
    const iv = combined.slice(16, 28)
    const encrypted = combined.slice(28)

    // Derive key from passkey key material
    const key = await deriveKeyFromPasskey(keyMaterial, salt)

    // Decrypt data
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encrypted
    )

    return new TextDecoder().decode(decryptedBuffer)
  } catch (error) {
    console.error('Passkey decryption failed:', error)
    throw new Error('Failed to decrypt data with passkey - authentication failed or corrupted data')
  }
}
