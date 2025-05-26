<template>
  <div class="bg-slate-50 rounded-xl p-4 border border-slate-200 relative">
    <!-- Copy Success Tooltip -->
    <div
      v-if="showCopyTooltip"
      class="absolute top-2 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-3 py-1 rounded-lg text-sm font-medium shadow-lg z-10 animate-pulse"
    >
      Copied!
    </div>

    <div class="flex justify-between items-center mb-3">
      <div>
        <div class="font-semibold text-slate-800 text-base">{{ account.label }}</div>
        <div v-if="account.issuer" class="text-sm text-slate-500 mb-2">{{ account.issuer }}</div>
      </div>
      <button
        @click="$emit('delete', account.id)"
        class="text-red-500 hover:bg-red-50 p-1 rounded transition-colors duration-200"
      >
        <Trash2 :size="16" />
      </button>
    </div>

    <div class="flex items-center justify-between">
      <div
        class="font-mono text-2xl sm:text-xl font-bold text-indigo-600 tracking-wider cursor-pointer select-none hover:text-indigo-700 transition-colors duration-200"
        @click="copyCode"
        title="Click to copy"
      >
        {{ formattedCode }}
      </div>

      <!-- Circular Progress Bar -->
      <div class="relative w-8 h-8 flex items-center justify-center ml-3">
        <svg class="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
          <!-- Background circle -->
          <circle
            cx="16"
            cy="16"
            r="14"
            stroke="currentColor"
            stroke-width="2"
            fill="none"
            class="text-slate-200"
          />
          <!-- Progress circle -->
          <circle
            cx="16"
            cy="16"
            r="14"
            stroke="currentColor"
            stroke-width="2"
            fill="none"
            :class="[progressCircleClass, { 'transition-all duration-1000 ease-linear': !shouldDisableTransition }]"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="strokeDashoffset"
            stroke-linecap="round"
          />
        </svg>
        <!-- Countdown number inside circle -->
        <div class="absolute inset-0 flex items-center justify-center">
          <span class="text-xs font-bold" :class="timeRemainingClass">{{ timeRemaining }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { TOTP } from 'otpauth'
import { Trash2 } from 'lucide-vue-next'

const props = defineProps({
  account: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['delete', 'copy'])

const currentTime = ref(Date.now())
const interval = ref(null)
const showCopyTooltip = ref(false)

// Create TOTP instance
const totp = computed(() => {
  return new TOTP({
    issuer: props.account.issuer,
    label: props.account.label,
    algorithm: props.account.algorithm || 'SHA1',
    digits: props.account.digits || 6,
    period: props.account.period || 30,
    secret: props.account.secret
  })
})

// Generate current TOTP code
const currentCode = computed(() => {
  // Make this reactive to currentTime so it updates when time changes
  currentTime.value // This creates the reactive dependency
  return totp.value.generate()
})

// Format code with spaces for better readability
const formattedCode = computed(() => {
  const code = currentCode.value
  if (code.length === 6) {
    return `${code.slice(0, 3)} ${code.slice(3)}`
  }
  return code
})

// Calculate time remaining in current period
const timeRemaining = computed(() => {
  const period = props.account.period || 30
  const elapsed = Math.floor(currentTime.value / 1000) % period
  return period - elapsed
})

// Circular progress bar calculations
const circumference = computed(() => {
  const radius = 14 // radius of the circle
  return 2 * Math.PI * radius
})

const strokeDashoffset = computed(() => {
  const period = props.account.period || 30
  const progress = timeRemaining.value / period
  return circumference.value * (1 - progress)
})

// Check if we should disable transition (when resetting from 0 to period)
const shouldDisableTransition = computed(() => {
  const period = props.account.period || 30
  return timeRemaining.value === period
})

// Progress circle color class based on time remaining
const progressCircleClass = computed(() => {
  const remaining = timeRemaining.value
  if (remaining <= 5) return 'text-red-500'
  if (remaining <= 10) return 'text-amber-500'
  return 'text-emerald-500'
})

// Time remaining text color class
const timeRemainingClass = computed(() => {
  const remaining = timeRemaining.value
  if (remaining <= 5) return 'text-red-600'
  if (remaining <= 10) return 'text-amber-600'
  return 'text-emerald-600'
})

const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(currentCode.value)
    showCopyTooltip.value = true
    setTimeout(() => {
      showCopyTooltip.value = false
    }, 2000)
    emit('copy', currentCode.value)
  } catch (err) {
    console.error('Failed to copy to clipboard:', err)
  }
}

onMounted(() => {
  // Update every second
  interval.value = setInterval(() => {
    currentTime.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (interval.value) {
    clearInterval(interval.value)
  }
})
</script>