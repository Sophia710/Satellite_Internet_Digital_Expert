<template>
  <svg
    class="ds-icon"
    :class="iconClass"
    viewBox="0 0 24 24"
    :width="size"
    :height="size"
    aria-hidden="true"
  >
    <use :href="`#i-${name}`"></use>
  </svg>
</template>

<script setup>
defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 18 },
  iconClass: { type: String, default: '' }
});
</script>
