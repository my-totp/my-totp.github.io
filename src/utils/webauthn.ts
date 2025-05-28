/**
 * WebAuthn utilities for passkey-based authentication and encryption
 * Uses WebAuthn API for passwordless authentication and key derivation
 */

import { arrayBufferToBase64url, base64urlToArrayBuffer } from './encoding'

// Generate a random challenge
function generateChallenge(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32))
}

// Check if WebAuthn is supported
export function isWebAuthnSupported(): boolean {
  return typeof window !== 'undefined' &&
         typeof window.PublicKeyCredential !== 'undefined' &&
         typeof navigator.credentials !== 'undefined'
}

// Check if passkeys are supported (platform authenticator)
export async function isPasskeySupported(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false

  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    return available
  } catch {
    return false
  }
}

interface PasskeyCredential {
  id: string
  publicKey: ArrayBuffer
  userHandle: string
}

interface PasskeyCreationResult {
  credential: PasskeyCredential
  keyMaterial: ArrayBuffer
}

/**
 * Create a new passkey credential with PRF extension and return both credential info and key material
 * @param {string} username - Username for the credential
 * @returns {Promise<PasskeyCreationResult>} Created credential info and key material
 */
export async function createPasskey(username: string = 'TOTP User'): Promise<PasskeyCreationResult> {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported in this browser')
  }

  const challenge = generateChallenge()
  const userHandle = crypto.getRandomValues(new Uint8Array(32))

  // Fixed salt for PRF to ensure consistent key derivation (same as in authenticateWithPasskey)
  const prfSalt = new TextEncoder().encode('TOTP-Authenticator-PRF-Salt-v1')

  const createOptions: CredentialCreationOptions = {
    publicKey: {
      challenge,
      rp: {
        name: 'TOTP Authenticator',
        id: window.location.hostname,
      },
      user: {
        id: userHandle,
        name: username,
        displayName: username,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' }, // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        requireResidentKey: true,
      },
      timeout: 60000,
      attestation: 'none',
      extensions: {
        prf: {
          eval: {
            first: prfSalt
          }
        }
      }
    },
  }

  const credential = await navigator.credentials.create(createOptions) as PublicKeyCredential

  if (!credential) {
    throw new Error('Failed to create passkey')
  }

  const response = credential.response as AuthenticatorAttestationResponse

  // Check if PRF extension is supported and get results
  const prfResults = credential.getClientExtensionResults().prf
  if (!prfResults?.enabled || !prfResults.results?.first) {
    throw new Error('PRF extension is required but not supported by this authenticator. Please use a compatible device.')
  }

  // Get PRF-derived key material
  const prfKey = prfResults.results.first
  const keyMaterial = prfKey instanceof ArrayBuffer ? prfKey : prfKey.buffer.slice(prfKey.byteOffset, prfKey.byteOffset + prfKey.byteLength)

  const credentialInfo: PasskeyCredential = {
    id: credential.id,
    publicKey: response.getPublicKey()!,
    userHandle: arrayBufferToBase64url(userHandle),
  }

  return {
    credential: credentialInfo,
    keyMaterial
  }
}

/**
 * Authenticate with existing passkey and derive stable key material using PRF
 * @param {string} credentialId - The credential ID to authenticate with
 * @returns {Promise<ArrayBuffer>} Stable key material derived from PRF extension
 */
export async function authenticateWithPasskey(credentialId?: string): Promise<ArrayBuffer> {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported in this browser')
  }

  // Fixed salt for PRF to ensure consistent key derivation
  const prfSalt = new TextEncoder().encode('TOTP-Authenticator-PRF-Salt-v1')

  const getOptions: CredentialRequestOptions = {
    publicKey: {
      challenge: generateChallenge(), // Can use random challenge since we're using PRF
      allowCredentials: credentialId ? [{
        type: 'public-key',
        id: base64urlToArrayBuffer(credentialId),
      }] : [],
      userVerification: 'required',
      timeout: 60000,
      extensions: {
        prf: {
          eval: {
            first: prfSalt
          }
        }
      }
    },
  }

  const credential = await navigator.credentials.get(getOptions) as PublicKeyCredential

  if (!credential) {
    throw new Error('Failed to authenticate with passkey')
  }

  // Check if PRF extension is supported and get results
  const prfResults = credential.getClientExtensionResults().prf
  if (!prfResults?.results?.first) {
    throw new Error('WebAuthn PRF extension is not supported on this device/browser. PRF is required for secure cross-session encryption. Please use a compatible browser/device or ensure your authenticator supports PRF.')
  }

  console.log('Using PRF-derived key material')
  // Convert BufferSource to ArrayBuffer if needed
  const prfKey = prfResults.results.first
  return prfKey instanceof ArrayBuffer ? prfKey : prfKey.buffer.slice(prfKey.byteOffset, prfKey.byteOffset + prfKey.byteLength)
}

/**
 * Derive encryption key from passkey key material (PRF output)
 * @param {ArrayBuffer} keyMaterial - Key material from passkey PRF extension
 * @param {Uint8Array} salt - Salt for key derivation
 * @returns {Promise<CryptoKey>} Derived encryption key
 */
export async function deriveKeyFromPasskey(keyMaterial: ArrayBuffer, salt: Uint8Array): Promise<CryptoKey> {
  // Import the key material
  const importedKey = await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    'HKDF',
    false,
    ['deriveKey']
  )

  // Derive AES key using HKDF
  return await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt,
      info: new TextEncoder().encode('TOTP-Authenticator-Encryption-Key'),
    },
    importedKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Store passkey credential info in localStorage
 * @param {PasskeyCredential} credential - Credential to store
 */
export function storePasskeyCredential(credential: PasskeyCredential): void {
  localStorage.setItem('passkey-credential', JSON.stringify({
    id: credential.id,
    userHandle: credential.userHandle,
  }))
}

/**
 * Get stored passkey credential info
 * @returns {object | null} Stored credential info or null
 */
export function getStoredPasskeyCredential(): { id: string; userHandle: string } | null {
  const stored = localStorage.getItem('passkey-credential')
  if (!stored) return null

  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}
