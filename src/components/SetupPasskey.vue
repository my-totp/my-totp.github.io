<template>
  <div class="bg-white rounded-2xl p-6 mb-5 shadow-xl backdrop-blur-sm">
    <div class="text-center mb-6">
      <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Fingerprint :size="32" class="text-blue-600" />
      </div>
      <h2 class="text-xl font-semibold text-slate-800 mb-2">
        Passkey Required
      </h2>
      <p class="text-slate-600">
        You must set up a passkey to use the TOTP Authenticator securely
      </p>
    </div>

    <!-- Passkey Support Check -->
    <div v-if="!passkeySupported" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
      <div class="flex items-start gap-3">
        <AlertCircle :size="20" class="text-red-600 mt-0.5 flex-shrink-0" />
        <div class="text-sm text-red-800">
          <p class="font-medium mb-1">Passkeys Not Supported</p>
          <p class="mb-2">Your browser or device doesn't support passkeys. Please use a modern browser with biometric authentication capability.</p>
          <p class="font-medium text-red-900">
            Passkeys are required to use this application. You cannot proceed without a compatible device.
          </p>
        </div>
      </div>
    </div>

    <div v-else>
      <div class="mb-6">
        <div class="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <CheckCircle :size="20" class="text-blue-600 flex-shrink-0" />
          <div class="text-sm text-blue-800">
            <p class="font-medium">Passkey Ready</p>
            <p>Your device supports biometric authentication</p>
          </div>
        </div>
      </div>

      <div v-if="error" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
        <p class="text-red-600 text-sm">{{ error }}</p>
      </div>

      <div class="space-y-3">
        <button
          @click="handleSetupPasskey"
          class="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          :disabled="isSettingUp || !passkeySupported"
        >
          <span v-if="!isSettingUp" class="flex items-center justify-center gap-2">
            <Fingerprint :size="20" />
            Create Passkey
          </span>
          <span v-else class="flex items-center justify-center gap-2">
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Creating passkey...
          </span>
        </button>
      </div>
    </div>

    <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div class="flex items-start gap-3">
        <Info :size="20" class="text-blue-600 mt-0.5 flex-shrink-0" />
        <div class="text-sm text-blue-800">
          <p class="font-medium mb-1">About Passkeys</p>
          <ul class="space-y-1">
            <li>• Uses your device's biometric authentication</li>
            <li>• More secure than passwords</li>
            <li>• Cannot be phished or stolen</li>
            <li>• Works offline once set up</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Fingerprint, Info, CheckCircle, AlertCircle } from 'lucide-vue-next'
import { isPasskeySupported, createPasskey, storePasskeyCredential } from '../utils/webauthn'

const emit = defineEmits(['setup'])

const passkeySupported = ref(false)
const isSettingUp = ref(false)
const error = ref('')

const handleSetupPasskey = async () => {
  try {
    isSettingUp.value = true
    error.value = ''

    // Create the passkey
    const credential = await createPasskey()

    // Store credential info (not the actual private key)
    storePasskeyCredential(credential)

    // Immediately authenticate with the new passkey to get key material
    const { authenticateWithPasskey } = await import('../utils/webauthn')
    const keyMaterial = await authenticateWithPasskey(credential.id)

    // Emit the setup event with both credential info and key material
    emit('setup', { credential, keyMaterial })

  } catch (err) {
    console.error('Passkey setup failed:', err)
    error.value = err.message || 'Failed to create passkey'
  } finally {
    isSettingUp.value = false
  }
}

onMounted(async () => {
  try {
    passkeySupported.value = await isPasskeySupported()
  } catch (err) {
    console.error('Error checking passkey support:', err)
    passkeySupported.value = false
  }
})
</script>