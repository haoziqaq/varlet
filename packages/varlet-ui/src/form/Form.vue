<template>
  <div class="var-form">
    <slot />
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { props } from './props'
import { useFormItems } from './provide'
import type { ComputedRef } from 'vue'
import type { FormProvider } from './provide'

export default defineComponent({
  name: 'VarForm',
  props,
  setup(props) {
    const disabled: ComputedRef<boolean> = computed(() => props.disabled)
    const readonly: ComputedRef<boolean> = computed(() => props.readonly)
    const { formItems, bindFormItems } = useFormItems()

    // expose
    const validate = async () => {
      const res = await Promise.all(formItems.map(({ validate }) => validate()))

      return res.every((r) => r === true)
    }

    // expose
    const reset = () => formItems.forEach(({ reset }) => reset())

    // expose
    const resetValidation = () => formItems.forEach(({ resetValidation }) => resetValidation())

    const formProvider: FormProvider = {
      disabled,
      readonly,
    }

    bindFormItems(formProvider)

    return {
      validate,
      reset,
      resetValidation,
    }
  },
})
</script>

<style lang="less">
@import '../styles/common';
</style>
