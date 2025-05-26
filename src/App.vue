<template>
  <div id="app" class="min-h-screen flex flex-col bg-gradient-to-br from-indigo-400 via-purple-400 to-purple-600">
    <div class="max-w-lg mx-auto p-5 flex-1 sm:p-4">
      <AppHeader
        :showLockButton="isUnlocked && encryptionEnabled && hasPasskeyConfigured"
        :isEncrypted="encryptionEnabled"
        @lock="handleLockStorage"
      />

      <!-- Passkey Setup - Show when no passkey is configured -->
      <SetupPasskey
        v-if="!hasPasskeyConfigured"
        @setup="handlePasskeySetup"
      />

      <!-- Loading State -->
      <div v-else-if="isLoading" class="bg-white rounded-2xl p-6 mb-5 shadow-xl backdrop-blur-sm">
        <div class="text-center py-10 px-5 text-slate-500">
          <div class="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 class="text-lg font-medium mb-2">Loading your accounts...</h3>
          <p>Please wait while we decrypt your data</p>
        </div>
      </div>

      <!-- Locked State -->
      <div v-else-if="shouldShowUnlockState" class="bg-white rounded-2xl p-6 mb-5 shadow-xl backdrop-blur-sm">
        <div class="text-center py-10 px-5 text-slate-500">
          <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
            </svg>
          </div>
          <h3 class="text-lg font-medium mb-2">Unlock with Passkey</h3>
          <p class="mb-4">Use your biometric authentication to access your TOTP accounts</p>

          <div v-if="unlockError" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-red-600 text-sm">{{ unlockError }}</p>
          </div>

          <button
            @click="handleDirectUnlock"
            class="py-4 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            :disabled="isUnlocking"
          >
            <span v-if="!isUnlocking" class="flex items-center justify-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
              </svg>
              Authenticate with Passkey
            </span>
            <span v-else class="flex items-center justify-center gap-2">
              <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Authenticating...
            </span>
          </button>

          <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div class="flex items-start gap-3">
              <svg class="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div class="text-sm text-blue-800 text-left">
                <p>Touch your fingerprint sensor, Face ID, or use your device's PIN to unlock.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State - Only show when no accounts and unlocked -->
      <EmptyState
        v-else-if="accounts.length === 0"
        @openChoice="openChoiceModal"
      />

      <!-- TOTP Accounts List -->
      <div v-else-if="accounts.length > 0">
        <!-- Search Input -->
        <SearchBar v-model="searchQuery" />

        <!-- Accounts List -->
        <AccountsList
          :accounts="filteredAccounts"
          :searchQuery="searchQuery"
          @delete="deleteAccount"
          @copy="copyToClipboard"
        />
      </div>

      <!-- Floating Action Button - Only show when there are accounts and unlocked -->
      <FloatingActionButton
        v-if="accounts.length > 0 && isUnlocked && hasPasskeyConfigured"
        @openScanner="openScanner"
      />

      <!-- Choice Modal -->
      <ChoiceModal
        :show="showChoiceModal"
        @close="showChoiceModal = false"
        @openScanner="openScanner"
        @openManual="openManualInput"
      />

      <!-- Add Account Modal -->
      <AddAccountModal
        v-if="showAddModal"
        :initial-mode="modalMode"
        @close="showAddModal = false"
        @add="addAccount"
      />

      <!-- Duplicate Account Modal -->
      <DuplicateAccountModal
        :show="showDuplicateModal"
        :duplicateAccount="duplicateAccount"
        @close="closeDuplicateModal"
        @addAnyway="addDuplicateAnyway"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, type Ref } from 'vue'
import AppHeader from './components/AppHeader.vue'
import EmptyState from './components/EmptyState.vue'
import SearchBar from './components/SearchBar.vue'
import AccountsList from './components/AccountsList.vue'
import FloatingActionButton from './components/FloatingActionButton.vue'
import ChoiceModal from './components/ChoiceModal.vue'
import DuplicateAccountModal from './components/DuplicateAccountModal.vue'
import AddAccountModal from './components/AddAccountModal.vue'
import SetupPasskey from './components/SetupPasskey.vue'
import { useSecureStorage, unlockStorage, lockStorage, hasEncryptedData, initializeEncryption } from './composables/useSecureStorage'
import { hasPasskeySetup } from './utils/webauthn'
import { isCryptoAvailable } from './utils/crypto'
import type { TOTPAccount, ModalMode } from './types'

const showAddModal = ref<boolean>(false)
const showChoiceModal = ref<boolean>(false)
const showDuplicateModal = ref<boolean>(false)
const modalMode = ref<ModalMode>('scanner')
const searchQuery = ref<string>('')
const hasPasskeyConfigured = ref<boolean>(false)
const isUnlocking = ref<boolean>(false)
const unlockError = ref<string>('')
const duplicateAccount = ref<{
  existing: TOTPAccount
  new: TOTPAccount
} | null>(null)

// Use secure storage instead of plain localStorage
const {
  data: accounts,
  isLoading,
  isUnlocked,
  encryptionEnabled,
  migrateToEncrypted
} = useSecureStorage<TOTPAccount[]>('totp-accounts', [])

// Filter accounts based on search query
const filteredAccounts = computed(() => {
  if (!searchQuery.value.trim()) {
    return accounts.value
  }

  const query = searchQuery.value.toLowerCase().trim()
  return accounts.value.filter((account: TOTPAccount) => {
    const label = (account.label || '').toLowerCase()
    const issuer = (account.issuer || '').toLowerCase()
    return label.includes(query) || issuer.includes(query)
  })
})

// Computed property to determine if we should show unlock state
const shouldShowUnlockState = computed(() => {
  return hasPasskeyConfigured.value &&
         !isUnlocked.value &&
         encryptionEnabled.value
})

const addAccount = (account: Omit<TOTPAccount, 'id' | 'addedAt'>) => {
  // Don't allow adding accounts if passkey is not configured
  if (!hasPasskeyConfigured.value) {
    return
  }

  // Check for duplicates based on secret, label, and issuer
  const existingAccount = accounts.value.find((existing: TOTPAccount) => {
    const sameSecret = existing.secret === account.secret
    const sameLabel = existing.label === account.label
    const sameIssuer = (existing.issuer || '') === (account.issuer || '')

    // Consider it a duplicate if secret matches and either label or issuer matches
    return sameSecret && (sameLabel || sameIssuer)
  })

  if (existingAccount) {
    duplicateAccount.value = {
      existing: existingAccount,
      new: account as TOTPAccount
    }
    showAddModal.value = false
    showDuplicateModal.value = true
    return
  }

  const newAccount: TOTPAccount = {
    id: Date.now().toString(),
    ...account,
    addedAt: Date.now()
  }
  accounts.value.push(newAccount)
  showAddModal.value = false
}

const closeDuplicateModal = (): void => {
  showDuplicateModal.value = false
  duplicateAccount.value = null
}

const addDuplicateAnyway = (): void => {
  if (duplicateAccount.value) {
    const { new: newAccount } = duplicateAccount.value
    const finalAccount: TOTPAccount = {
      ...newAccount,
      id: Date.now().toString(),
      addedAt: Date.now()
    }
    accounts.value.push(finalAccount)
  }
  closeDuplicateModal()
}

const deleteAccount = (accountId: string): void => {
  // Don't allow deleting accounts if passkey is not configured
  if (!hasPasskeyConfigured.value) {
    return
  }

  if (confirm('Are you sure you want to delete this account?')) {
    accounts.value = accounts.value.filter((account: TOTPAccount) => account.id !== accountId)
  }
}

const openChoiceModal = (): void => {
  // Don't allow adding accounts if passkey is not configured
  if (!hasPasskeyConfigured.value) {
    return
  }
  showChoiceModal.value = true
}

const openScanner = (): void => {
  // Don't allow adding accounts if passkey is not configured
  if (!hasPasskeyConfigured.value) {
    return
  }
  showChoiceModal.value = false
  modalMode.value = 'scanner'
  showAddModal.value = true
  // The modal will auto-start scanning based on the mode
}

const openManualInput = (): void => {
  // Don't allow adding accounts if passkey is not configured
  if (!hasPasskeyConfigured.value) {
    return
  }
  showChoiceModal.value = false
  modalMode.value = 'manual'
  showAddModal.value = true
}

const copyToClipboard = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text)
    // You could add a toast notification here
  } catch (err) {
    console.error('Failed to copy to clipboard:', err)
  }
}

// Passkey authentication functions
const handleDirectUnlock = async (): Promise<void> => {
  try {
    isUnlocking.value = true
    unlockError.value = ''

    const { authenticateWithPasskey, getStoredPasskeyCredential } = await import('./utils/webauthn')
    const storedCredential = getStoredPasskeyCredential()
    const keyMaterial = await authenticateWithPasskey(storedCredential?.id)

    await unlockStorage(keyMaterial)
  } catch (err) {
    console.error('Passkey authentication failed:', err)
    unlockError.value = err instanceof Error ? err.message : 'Failed to authenticate with passkey'
  } finally {
    isUnlocking.value = false
  }
}



const handlePasskeySetup = async (setupResult: { credential: any, keyMaterial: ArrayBuffer }): Promise<void> => {
  try {
    // Unlock storage with the key material from passkey setup
    await unlockStorage(setupResult.keyMaterial)

    // Now migrate existing data to encrypted format
    await migrateToEncrypted()

    // Update the passkey configured status
    hasPasskeyConfigured.value = true


  } catch (err) {
    console.error('Failed to set up passkey:', err)
    throw new Error('Failed to set up passkey encryption')
  }
}

const handleLockStorage = (): void => {
  lockStorage()
}

// Check encryption status on mount
onMounted(async () => {
  // Initialize encryption based on browser capability
  initializeEncryption()

  if (!isCryptoAvailable()) {
    console.warn('Web Crypto API not available, encryption disabled')
    return
  }

  // Check if passkey is configured
  hasPasskeyConfigured.value = hasPasskeySetup()

  if (!hasPasskeyConfigured.value) {
    // No passkey configured, the SetupPasskey component will be shown automatically
    // Don't allow any other actions until passkey is set up
  }
  // If passkey is configured but storage is locked, the shouldShowUnlockState computed will handle showing the unlock UI
  // If passkey is configured and unlocked, proceed normally
})
</script>