<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-5" @click="closeModal">
    <div class="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" @click.stop>
      <div class="flex justify-between items-center mb-5">
        <h2 class="text-xl font-semibold text-slate-800">Add TOTP Account</h2>
        <button @click="closeModal" class="text-slate-500 hover:text-slate-700 text-2xl p-1">×</button>
      </div>

      <div v-if="!showManualForm">
        <!-- QR Scanner -->
        <div v-if="showScanner" class="relative w-full h-72 rounded-xl overflow-hidden mb-5">
          <video ref="videoElement" class="w-full h-full object-cover" autoplay muted playsinline></video>
          <div class="scanner-overlay absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-indigo-600 rounded-xl bg-indigo-600 bg-opacity-10"></div>
        </div>

        <div v-if="scanError" class="text-red-500 mb-4 text-center">
          {{ scanError }}
        </div>

        <button
          v-if="!showScanner"
          @click="startScanning"
          class="w-full py-4 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/30 flex items-center justify-center gap-2 mb-4"
        >
          <Camera :size="20" />
          Start Camera
        </button>

        <button
          v-if="showScanner"
          @click="stopScanning"
          class="w-full py-4 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors duration-200 flex items-center justify-center gap-2 mb-4"
        >
          <CameraOff :size="20" />
          Stop Camera
        </button>

        <button
          @click="showManualForm = true"
          class="w-full py-4 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors duration-200 flex items-center justify-center gap-2"
        >
          <Edit :size="20" />
          Enter Manually
        </button>
      </div>

      <!-- Manual Form -->
      <div v-else>
        <form @submit.prevent="addManualAccount">
          <div class="mb-4">
            <label class="block mb-2 font-medium text-gray-700">Account Name *</label>
            <input
              v-model="manualForm.label"
              type="text"
              class="w-full p-3 border border-gray-300 rounded-lg text-base transition-colors duration-200 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600 focus:ring-opacity-20"
              placeholder="e.g., john@example.com"
              required
            />
          </div>

          <div class="mb-4">
            <label class="block mb-2 font-medium text-gray-700">Issuer</label>
            <input
              v-model="manualForm.issuer"
              type="text"
              class="w-full p-3 border border-gray-300 rounded-lg text-base transition-colors duration-200 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600 focus:ring-opacity-20"
              placeholder="e.g., Google, GitHub"
            />
          </div>

          <div class="mb-4">
            <label class="block mb-2 font-medium text-gray-700">Secret Key *</label>
            <input
              v-model="manualForm.secret"
              type="text"
              class="w-full p-3 border border-gray-300 rounded-lg text-base transition-colors duration-200 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600 focus:ring-opacity-20"
              placeholder="Base32 encoded secret"
              required
            />
          </div>

          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block mb-2 font-medium text-gray-700">Digits</label>
              <select
                v-model="manualForm.digits"
                class="w-full p-3 border border-gray-300 rounded-lg text-base transition-colors duration-200 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600 focus:ring-opacity-20"
              >
                <option value="6">6</option>
                <option value="8">8</option>
              </select>
            </div>

            <div>
              <label class="block mb-2 font-medium text-gray-700">Period (seconds)</label>
              <input
                v-model.number="manualForm.period"
                type="number"
                class="w-full p-3 border border-gray-300 rounded-lg text-base transition-colors duration-200 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600 focus:ring-opacity-20"
                min="15"
                max="300"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <button
              type="button"
              @click="showManualForm = false"
              class="py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <ArrowLeft :size="20" />
              Back
            </button>
            <button
              type="submit"
              class="py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/30 flex items-center justify-center gap-2"
            >
              <Plus :size="20" />
              Add Account
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import QrScanner from 'qr-scanner'
import { Camera, CameraOff, Edit, ArrowLeft, Plus } from 'lucide-vue-next'
import type { ModalMode, TOTPAccount } from '../types'

interface Props {
  initialMode?: ModalMode
}

const props = withDefaults(defineProps<Props>(), {
  initialMode: 'scanner'
})

const emit = defineEmits<{
  close: []
  add: [account: Omit<TOTPAccount, 'id' | 'addedAt'>]
}>()

const showScanner = ref<boolean>(false)
const showManualForm = ref<boolean>(false)
const scanError = ref<string>('')
const videoElement = ref<HTMLVideoElement | null>(null)
const qrScanner = ref<QrScanner | null>(null)

const manualForm = ref<{
  label: string
  issuer: string
  secret: string
  digits: number
  period: number
  algorithm: 'SHA1' | 'SHA256' | 'SHA512'
}>({
  label: '',
  issuer: '',
  secret: '',
  digits: 6,
  period: 30,
  algorithm: 'SHA1'
})

// Initialize modal based on initial mode
const initializeModal = async (): Promise<void> => {
  if (props.initialMode === 'manual') {
    showManualForm.value = true
  } else {
    showManualForm.value = false
    // Auto-start scanning when in scanner mode
    await startScanning()
  }
}

const closeModal = (): void => {
  stopScanning()
  emit('close')
}

const startScanning = async (): Promise<void> => {
  try {
    scanError.value = ''

    if (!QrScanner.hasCamera()) {
      scanError.value = 'No camera found on this device'
      return
    }

    showScanner.value = true

    // Wait for next tick to ensure video element is rendered
    await new Promise(resolve => setTimeout(resolve, 100))

    qrScanner.value = new QrScanner(
      videoElement.value!,
      result => handleScanResult(result.data),
      {
        highlightScanRegion: true,
        highlightCodeOutline: true,
      }
    )

    await qrScanner.value.start()
  } catch (error) {
    console.error('Error starting scanner:', error)
    scanError.value = 'Failed to start camera. Please check permissions.'
    showScanner.value = false
  }
}

const stopScanning = (): void => {
  if (qrScanner.value) {
    qrScanner.value.stop()
    qrScanner.value.destroy()
    qrScanner.value = null
  }
  showScanner.value = false
}

const handleScanResult = (data: string): void => {
  try {
    // Parse TOTP URI (otpauth://totp/...)
    const url = new URL(data)

    if (url.protocol !== 'otpauth:' || url.hostname !== 'totp') {
      throw new Error('Invalid TOTP QR code')
    }

    const params = url.searchParams
    const pathParts = url.pathname.slice(1).split(':')

    const secret = params.get('secret')
    if (!secret) {
      throw new Error('No secret found in QR code')
    }

    const account: Omit<TOTPAccount, 'id' | 'addedAt'> = {
      label: decodeURIComponent(pathParts.length > 1 ? pathParts[1] : pathParts[0]),
      issuer: decodeURIComponent(pathParts.length > 1 ? pathParts[0] : params.get('issuer') || ''),
      secret,
      digits: parseInt(params.get('digits') || '6'),
      period: parseInt(params.get('period') || '30'),
      algorithm: (params.get('algorithm') as 'SHA1' | 'SHA256' | 'SHA512') || 'SHA1'
    }

    stopScanning()
    emit('add', account)
  } catch (error) {
    console.error('Error parsing QR code:', error)
    scanError.value = 'Invalid QR code. Please try again.'
  }
}

const addManualAccount = () => {
  if (!manualForm.value.label || !manualForm.value.secret) {
    return
  }

  // Clean up the secret (remove spaces and convert to uppercase)
  const cleanSecret = manualForm.value.secret.replace(/\s/g, '').toUpperCase()

  const account = {
    ...manualForm.value,
    secret: cleanSecret
  }

  emit('add', account)
}

onMounted(() => {
  initializeModal()
})

onUnmounted(() => {
  stopScanning()
})
</script>