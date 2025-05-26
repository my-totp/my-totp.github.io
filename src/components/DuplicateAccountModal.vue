<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-5" @click="$emit('close')">
    <div class="bg-white rounded-2xl p-6 max-w-md w-full" @click.stop>
      <div class="text-center mb-6">
        <div class="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield :size="32" class="text-amber-600" />
        </div>
        <h2 class="text-xl font-semibold text-slate-800 mb-2">Duplicate Account Detected</h2>
        <p class="text-slate-600">This account appears to already exist in your authenticator.</p>
      </div>

      <div v-if="duplicateAccount" class="bg-slate-50 rounded-xl p-4 mb-6">
        <div class="text-sm text-slate-600 mb-2">Existing Account:</div>
        <div class="font-semibold text-slate-800">{{ duplicateAccount.existing.label }}</div>
        <div v-if="duplicateAccount.existing.issuer" class="text-sm text-slate-500">{{ duplicateAccount.existing.issuer }}</div>
      </div>

      <div class="space-y-3">
        <button
          @click="$emit('close')"
          class="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/30"
        >
          Keep Existing Account
        </button>

        <button
          @click="$emit('addAnyway')"
          class="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors duration-200"
        >
          Add Anyway
        </button>
      </div>

      <div class="text-center mt-4">
        <p class="text-xs text-slate-500">Adding duplicate accounts may cause confusion</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Shield } from 'lucide-vue-next'

defineProps({
  show: {
    type: Boolean,
    default: false
  },
  duplicateAccount: {
    type: Object,
    default: null
  }
})

defineEmits(['close', 'addAnyway'])
</script>