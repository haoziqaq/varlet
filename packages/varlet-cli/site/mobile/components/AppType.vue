<template>
  <div class="app-type">
    <slot />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'AppType',
})
</script>

<style lang="less">
.app-type {
  width: 100%;
  padding: 15px 0;
  color: #888;
  font-size: 14px;
}
</style>
