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

    <h1 class="text-3xl sm:text-2xl font-semibold mb-2">🔐 MY TOTP</h1>
    <p class="opacity-90 text-base">
      Secure offline two-factor authentication
    </p>
  </header>
</template>

<script setup>
import { Lock, Shield } from 'lucide-vue-next'

defineProps({
  showLockButton: {
    type: Boolean,
    default: false
  }
})

defineEmits(['lock'])
</script>