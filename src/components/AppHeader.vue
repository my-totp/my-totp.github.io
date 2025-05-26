<template>
  <header class="text-center mb-5 text-white relative">
    <!-- Lock button - positioned absolutely in top right -->
    <button
      v-if="showLockButton"
      @click="$emit('lock')"
      class="absolute top-0 right-0 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors duration-200"
      title="Lock accounts"
    >
      <Lock :size="20" />
    </button>

    <h1 class="text-3xl sm:text-2xl font-semibold mb-2">🔐 TOTP Authenticator</h1>
    <p class="opacity-90 text-base">
      Secure offline two-factor authentication
      <span v-if="isEncrypted" class="inline-flex items-center gap-1 ml-2 text-sm">
        <Shield :size="14" />
        Encrypted
      </span>
    </p>
  </header>
</template>

<script setup>
import { Lock, Shield } from 'lucide-vue-next'

defineProps({
  showLockButton: {
    type: Boolean,
    default: false
  },
  isEncrypted: {
    type: Boolean,
    default: false
  }
})

defineEmits(['lock'])
</script>