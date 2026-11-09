<template>
  <Sprite />
  <router-view />
  <PopoverHost />
  <ConfirmDialog />
</template>

<script setup>
import Sprite from './shared/ui/Sprite.vue';
import PopoverHost from './shared/ui/PopoverHost.vue';
import ConfirmDialog from './shared/ui/ConfirmDialog.vue';
</script>
