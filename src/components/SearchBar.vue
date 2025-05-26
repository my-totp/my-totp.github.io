<template>
  <div class="bg-white rounded-2xl p-3 mb-4 shadow-xl backdrop-blur-sm">
    <div class="relative">
      <Search :size="16" class="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
      <input
        :value="modelValue"
        @input="$emit('update:modelValue', $event.target.value)"
        type="text"
        placeholder="Search accounts..."
        class="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-sm"
      />
    </div>
  </div>
</template>

<script setup>
import { Search } from 'lucide-vue-next'

defineProps({
  modelValue: {
    type: String,
    default: ''
  }
})

defineEmits(['update:modelValue'])
</script>