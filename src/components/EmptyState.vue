<template>
  <div class="bg-white rounded-2xl p-6 mb-5 shadow-xl backdrop-blur-sm">
    <!-- Add Account Button - Only show when no accounts -->
    <div>
      <button
        @click="$emit('openChoice')"
        class="w-full py-4 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/30 flex items-center justify-center gap-2"
      >
        <QrCode :size="20" />
        Add Account
      </button>
    </div>

    <!-- Empty State Message -->
    <div class="text-center py-10 px-5 text-slate-500">
      <Shield :size="48" class="mx-auto mb-4 opacity-50" />
      <h3 class="text-lg font-medium mb-2">No accounts added yet</h3>
      <p>Scan a QR code to add your first TOTP account</p>
    </div>
  </div>
</template>

<script setup>
import { QrCode, Shield } from 'lucide-vue-next'

defineEmits(['openChoice'])
</script>