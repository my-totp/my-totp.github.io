import { ref, watch, type Ref } from 'vue'
import { encryptData, decryptData, isCryptoAvailable } from '../utils/crypto'
import { hasPasskeySetup } from '../utils/webauthn'

// Global state for passkey authentication
const isUnlocked: Ref<boolean> = ref(false)
const currentPasskeyKeyMaterial: Ref<ArrayBuffer | null> = ref(null)
const encryptionEnabled: Ref<boolean> = ref(true)

// Check user's encryption preference from localStorage
const getEncryptionPreference = (): boolean => {
  const preference = localStorage.getItem('encryption-preference')
  return preference !== 'disabled'
}

// Set user's encryption preference
const setEncryptionPreference = (enabled: boolean): void => {
  localStorage.setItem('encryption-preference', enabled ? 'enabled' : 'disabled')
}

interface SecureStorageReturn<T> {
  data: Ref<T>
  isLoading: Ref<boolean>
  error: Ref<string | null>
  loadData: () => Promise<void>
  saveData: () => Promise<void>
  isDataEncrypted: () => boolean
  migrateToEncrypted: () => Promise<void>
  isUnlocked: Ref<boolean>
  currentPasskeyKeyMaterial: Ref<ArrayBuffer | null>
  encryptionEnabled: Ref<boolean>
}

/**
 * Composable for secure encrypted localStorage with passkey authentication
 * @param {string} key - localStorage key
 * @param {T} defaultValue - default value if no data exists
 * @returns {SecureStorageReturn<T>} Reactive storage object with encryption
 */
export function useSecureStorage<T = any>(key: string, defaultValue: T = null as T): SecureStorageReturn<T> {
  const data = ref<T>(defaultValue)
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)

  // Check if encryption is available and enabled
  const canUseEncryption = isCryptoAvailable() && encryptionEnabled.value

  /**
   * Load data from localStorage (with decryption if needed)
   */
  const loadData = async () => {
    try {
      isLoading.value = true
      error.value = null

      const stored = localStorage.getItem(key)
      if (!stored) {
        data.value = defaultValue
        return
      }

      // Check if data is encrypted
      const isEncrypted = stored.startsWith('encrypted:')

      if (isEncrypted && canUseEncryption && currentPasskeyKeyMaterial.value) {
        // Decrypt with passkey
        const encryptedData = stored.substring(10) // Remove 'encrypted:' prefix
        try {
          const decryptedJson = await decryptData(encryptedData, currentPasskeyKeyMaterial.value)
          data.value = JSON.parse(decryptedJson)
        } catch (decryptError: unknown) {
          const errorMessage = decryptError instanceof Error ? decryptError.message : 'Unknown error'
          if (errorMessage.includes('authentication failed') || errorMessage.includes('Failed to decrypt')) {
            throw new Error('Invalid passkey authentication or corrupted data')
          }
          throw decryptError
        }
      } else if (!isEncrypted) {
        // Plain text data (legacy or encryption disabled)
        data.value = JSON.parse(stored)
      } else {
        // Encrypted data but no passkey authentication available
        throw new Error('Data is encrypted but no passkey authentication available')
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Failed to load data:', err)
      error.value = errorMessage
      data.value = defaultValue
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Save data to localStorage (with encryption if enabled)
   */
  const saveData = async () => {
    try {
      isLoading.value = true
      error.value = null

      const jsonData = JSON.stringify(data.value)

      if (canUseEncryption && currentPasskeyKeyMaterial.value) {
        // Encrypt with passkey
        const encryptedData = await encryptData(jsonData, currentPasskeyKeyMaterial.value)
        localStorage.setItem(key, `encrypted:${encryptedData}`)
      } else {
        // Store as plain text
        localStorage.setItem(key, jsonData)
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Failed to save data:', err)
      error.value = errorMessage
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Check if stored data is encrypted
   */
  const isDataEncrypted = (): boolean => {
    const stored = localStorage.getItem(key)
    return Boolean(stored && stored.startsWith('encrypted:'))
  }

  /**
   * Migrate plain text data to encrypted format
   */
  const migrateToEncrypted = async () => {
    if (!canUseEncryption || !currentPasskeyKeyMaterial.value) {
      throw new Error('Cannot migrate: encryption not available or no passkey authentication')
    }

    const stored = localStorage.getItem(key)
    if (stored && !stored.startsWith('encrypted:')) {
      // Data exists and is not encrypted, migrate it
      data.value = JSON.parse(stored)
      await saveData() // This will encrypt it using the passkey
    }
  }

  // Watch for data changes and auto-save
  watch(data, saveData, { deep: true })

  // Load data when passkey becomes available
  watch([currentPasskeyKeyMaterial, isUnlocked], () => {
    if (isUnlocked.value && currentPasskeyKeyMaterial.value) {
      loadData()
    }
  })

  return {
    data: data as Ref<T>,
    isLoading,
    error,
    loadData,
    saveData,
    isDataEncrypted,
    migrateToEncrypted,
    // Expose global state
    isUnlocked,
    currentPasskeyKeyMaterial,
    encryptionEnabled
  }
}

/**
 * Set the passkey key material and unlock the storage
 * @param {ArrayBuffer} keyMaterial - The passkey authentication key material (PRF result or signature)
 */
export async function unlockStorage(keyMaterial: ArrayBuffer): Promise<void> {
  // Test the key material by trying to decrypt existing data
  if (hasEncryptedData()) {
    let keyMaterialValid = false

    // Find the first encrypted item and try to decrypt it to validate key material
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i)
      const value = storageKey ? localStorage.getItem(storageKey) : null
      if (storageKey && value && value.startsWith('encrypted:')) {
        try {
          const encryptedData = value.substring(10) // Remove 'encrypted:' prefix
          await decryptData(encryptedData, keyMaterial)
          // If we get here, key material is correct
          keyMaterialValid = true
          break
        } catch (err) {
          // Continue checking other items in case this one is corrupted
          continue
        }
      }
    }

    if (!keyMaterialValid) {
      throw new Error('Invalid passkey authentication or corrupted data')
    }
  }

  // Only set key material and unlock state after successful validation
  currentPasskeyKeyMaterial.value = keyMaterial
  isUnlocked.value = true
}

/**
 * Lock the storage and clear the passkey key material from memory
 */
export function lockStorage(): void {
  currentPasskeyKeyMaterial.value = null
  isUnlocked.value = false
}

/**
 * Check if there's any encrypted data in localStorage
 */
export function hasEncryptedData(): boolean {
  for (let i = 0; i < localStorage.length; i++) {
    const storageKey = localStorage.key(i)
    const value = storageKey ? localStorage.getItem(storageKey) : null
    if (storageKey && value && value.startsWith('encrypted:')) {
      return true
    }
  }
  return false
}

/**
 * Initialize encryption based on user preference
 */
export function initializeEncryption(): boolean {
  const preference = getEncryptionPreference()
  if (isCryptoAvailable() && preference) {
    encryptionEnabled.value = true
  } else {
    encryptionEnabled.value = false
  }
  return encryptionEnabled.value
}
