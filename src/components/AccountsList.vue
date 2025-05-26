<template>
  <div>
    <!-- Filtered Accounts -->
    <div v-for="account in accounts" :key="account.id" class="bg-white rounded-2xl p-3 mb-3 shadow-xl backdrop-blur-sm">
      <TOTPItem
        :account="account"
        @delete="$emit('delete', $event)"
        @copy="$emit('copy', $event)"
      />
    </div>

    <!-- No results message -->
    <div v-if="accounts.length === 0 && searchQuery" class="bg-white rounded-2xl p-6 mb-5 shadow-xl backdrop-blur-sm">
      <div class="text-center py-6 px-5 text-slate-500">
        <Search :size="48" class="mx-auto mb-4 opacity-50" />
        <h3 class="text-lg font-medium mb-2">No accounts found</h3>
        <p>Try adjusting your search terms</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Search } from 'lucide-vue-next'
import TOTPItem from './TOTPItem.vue'

defineProps({
  accounts: {
    type: Array,
    required: true
  },
  searchQuery: {
    type: String,
    default: ''
  }
})

defineEmits(['delete', 'copy'])
</script>