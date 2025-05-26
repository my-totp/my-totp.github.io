<template>
  <div class="fixed bottom-6 right-6">
    <!-- Scan QR Button -->
    <button
      @click="$emit('openScanner')"
      class="w-14 h-14 bg-white text-indigo-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center border-2 border-indigo-200 hover:bg-indigo-50"
      title="Scan QR code"
    >
      <QrCode :size="20" />
    </button>
  </div>
</template>

<script setup>
import { QrCode } from 'lucide-vue-next'

defineEmits(['openScanner'])
</script>