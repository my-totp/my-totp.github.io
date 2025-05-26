<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-5" @click="$emit('close')">
    <div class="bg-white rounded-2xl p-6 max-w-sm w-full" @click.stop>
      <div class="text-center mb-6">
        <h2 class="text-xl font-semibold text-slate-800 mb-2">Add TOTP Account</h2>
        <p class="text-slate-600">Choose how you'd like to add your account</p>
      </div>

      <div class="space-y-3">
        <button
          @click="$emit('openScanner')"
          class="w-full py-4 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/30 flex items-center justify-center gap-3"
        >
          <QrCode :size="24" />
          <div class="text-left">
            <div class="font-semibold">Scan QR Code</div>
            <div class="text-sm opacity-90">Use your camera to scan</div>
          </div>
        </button>

        <button
          @click="$emit('openManual')"
          class="w-full py-4 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors duration-200 flex items-center justify-center gap-3"
        >
          <Edit :size="24" />
          <div class="text-left">
            <div class="font-semibold">Enter Manually</div>
            <div class="text-sm opacity-75">Type the secret key</div>
          </div>
        </button>
      </div>

      <button
        @click="$emit('close')"
        class="w-full mt-4 py-3 px-4 text-gray-500 hover:text-gray-700 transition-colors duration-200"
      >
        Cancel
      </button>
    </div>
  </div>
</template>

<script setup>
import { QrCode, Edit } from 'lucide-vue-next'

defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

defineEmits(['close', 'openScanner', 'openManual'])
</script>