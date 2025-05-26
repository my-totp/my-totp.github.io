/**
 * WebAuthn utilities for passkey-based authentication and encryption
 * Uses WebAuthn API for passwordless authentication and key derivation
 */

// Generate a random challenge
function generateChallenge(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32))
}

// Convert ArrayBuffer to base64url
function arrayBufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

// Convert base64url to ArrayBuffer
function base64urlToArrayBuffer(base64url: string): ArrayBuffer {
  // Add padding if needed
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) {
    base64 += '='
  }

  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
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

export interface PasskeyCredential {
  id: string
  publicKey: ArrayBuffer
  userHandle: string
}

/**
 * Create a new passkey credential with PRF extension
 * @param {string} username - Username for the credential
 * @returns {Promise<PasskeyCredential>} Created credential info
 */
export async function createPasskey(username: string = 'TOTP User'): Promise<PasskeyCredential> {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported in this browser')
  }

  const challenge = generateChallenge()
  const userHandle = crypto.getRandomValues(new Uint8Array(32))

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
        prf: {}
      }
    },
  }

  const credential = await navigator.credentials.create(createOptions) as PublicKeyCredential

  if (!credential) {
    throw new Error('Failed to create passkey')
  }

  const response = credential.response as AuthenticatorAttestationResponse

  // Check if PRF extension is supported
  const prfResults = credential.getClientExtensionResults().prf
  if (!prfResults?.enabled) {
    throw new Error('PRF extension is required but not supported by this authenticator. Please use a compatible device.')
  }

  return {
    id: credential.id,
    publicKey: response.getPublicKey()!,
    userHandle: arrayBufferToBase64url(userHandle),
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

  const response = credential.response as AuthenticatorAssertionResponse

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
    // Don't store the actual public key, just metadata
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



/**
 * Check if user has a passkey set up
 * @returns {boolean} True if passkey is configured
 */
export function hasPasskeySetup(): boolean {
  return getStoredPasskeyCredential() !== null
}
