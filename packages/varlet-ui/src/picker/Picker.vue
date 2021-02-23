<template>
  <component
    :is="dynamic ? 'var-popup' : Transition"
    v-bind="
      dynamic
        ? {
            onOpened,
            onClose,
            onClosed,
            onClickOverlay,
            onRouteChange,
            closeOnClickOverlay,
            teleport,
            show,
            'onUpdate:show': (value) => $props['onUpdate:show'] && $props['onUpdate:show'](value),
            position: 'bottom',
          }
        : null
    "
  >
    <div class="var-picker" v-bind="$attrs">
      <div class="var-picker__toolbar">
        <slot name="cancel">
          <var-button class="var-picker__cancel-button" plain :text-color="cancelButtonColor" @click="cancel">
            {{ cancelButtonText }}
          </var-button>
        </slot>
        <slot name="title">
          <div class="var-picker__title">{{ title }}</div>
        </slot>
        <slot name="confirm">
          <var-button class="var-picker__confirm-button" plain :text-color="confirmButtonColor" @click="confirm">
            {{ confirmButtonText }}
          </var-button>
        </slot>
      </div>
      <div class="var-picker__columns" :style="{ height: `${columnHeight}px` }">
        <div
          class="var-picker__column"
          v-for="c in scrollColumns"
          :key="c"
          @touchstart="handleTouchstart($event, c)"
          @touchmove.prevent="handleTouchmove($event, c)"
          @touchend="handleTouchend($event, c)"
        >
          <div
            class="var-picker__scroller"
            :ref="(el) => (c.scrollEl = el)"
            :style="{
              transform: `translateY(${c.translate}px)`,
              transitionDuration: `${c.duration}ms`,
              transitionProperty: c.duration ? 'transform' : 'none',
            }"
            @transitionend="handleTransitionend(c)"
          >
            <div
              class="var-picker__option"
              :style="{ height: `${optionHeight}px` }"
              v-for="t in c.column.texts"
              :key="t"
            >
              {{ t }}
            </div>
          </div>
        </div>
        <div
          class="var-picker__picked"
          :style="{
            top: `${center}px`,
            height: `${optionHeight}px`,
          }"
        ></div>
        <div class="var-picker__mask" :style="{ backgroundSize: `100% ${(columnHeight - optionHeight) / 2}px` }"></div>
      </div>
    </div>
  </component>
</template>

<script lang="ts">
import { defineComponent, watch, ref, Ref, computed, ComputedRef, Transition, toRaw } from 'vue'
import { CascadeColumn, NormalColumn, props } from './props'
import { isArray } from '../utils/shared'
import Button from '../button'
import Popup from '../popup'

interface ScrollColumn {
  touching: boolean
  index: number
  prevY: number | undefined
  momentumPrevY: number | undefined
  momentumTime: number
  translate: number
  duration: number
  scrolling: boolean
  column: NormalColumn
  columns?: CascadeColumn[]
  scrollEl: HTMLElement | null
}

const MOMENTUM_RECORD_TIME = 300
const MOMENTUM_ALLOW_DISTANCE = 15

export default defineComponent({
  name: 'VarPicker',
  components: {
    [Button.name]: Button,
    [Popup.name]: Popup,
  },
  inheritAttrs: false,
  props,
  setup(props) {
    const scrollerEls: Ref<HTMLElement[]> = ref([])
    const scrollColumns: Ref<ScrollColumn[]> = ref([])
    const center: ComputedRef<number> = computed(
      () => (props.optionCount * props.optionHeight) / 2 - props.optionHeight / 2
    )
    const columnHeight: ComputedRef<number> = computed(() => props.optionCount * props.optionHeight)
    let prevIndexes: number[] = []

    const getTranslate = (el: HTMLElement) => {
      const { transform } = window.getComputedStyle(el)
      return +transform.slice(transform.lastIndexOf(',') + 2, transform.length - 1)
    }

    const limitTranslate = (scrollColumn: ScrollColumn) => {
      const { optionHeight } = props
      const START_LIMIT = optionHeight + center.value
      const END_LIMIT = center.value - scrollColumn.column.texts.length * optionHeight

      if (scrollColumn.translate >= START_LIMIT) {
        scrollColumn.translate = START_LIMIT
      }
      if (scrollColumn.translate <= END_LIMIT) {
        scrollColumn.translate = END_LIMIT
      }
    }

    const boundaryIndex = (scrollColumn: ScrollColumn, index: number) => {
      const { length } = scrollColumn.column.texts

      index = index >= length ? length - 1 : index
      index = index <= 0 ? 0 : index

      return index
    }

    const getIndex = (scrollColumn: ScrollColumn) => {
      const index = Math.round((center.value - scrollColumn.translate) / props.optionHeight)

      return boundaryIndex(scrollColumn, index)
    }

    const getPicked = () => {
      const texts = scrollColumns.value.map((scrollColumn) => scrollColumn.column.texts[scrollColumn.index])
      const indexes = scrollColumns.value.map((scrollColumn) => scrollColumn.index)

      return {
        texts,
        indexes,
      }
    }

    const scrollTo = (scrollColumn: ScrollColumn, index: number, duration: number) => {
      const { optionHeight } = props
      const translate = center.value - boundaryIndex(scrollColumn, index) * optionHeight

      if (translate === scrollColumn.translate) {
        scrollColumn.scrolling = false
        change(scrollColumn)
      }

      scrollColumn.translate = translate
      scrollColumn.duration = duration
    }

    const momentum = (scrollColumn: ScrollColumn, distance: number, duration: number) => {
      scrollColumn.translate += (Math.abs(distance / duration) / 0.003) * (distance < 0 ? -1 : 1)
    }

    const handleTouchstart = (event: TouchEvent, scrollColumn: ScrollColumn) => {
      scrollColumn.touching = true
      scrollColumn.scrolling = false
      scrollColumn.duration = 0
      scrollColumn.translate = getTranslate(scrollColumn.scrollEl as HTMLElement)
    }

    const handleTouchmove = (event: TouchEvent, scrollColumn: ScrollColumn) => {
      if (!scrollColumn.touching) {
        return
      }

      const { clientY } = event.touches[0]
      const moveY = scrollColumn.prevY !== undefined ? clientY - scrollColumn.prevY : 0
      scrollColumn.prevY = clientY
      scrollColumn.translate += moveY

      limitTranslate(scrollColumn)

      const now = performance.now()
      if (now - scrollColumn.momentumTime > MOMENTUM_RECORD_TIME) {
        scrollColumn.momentumTime = now
        scrollColumn.momentumPrevY = scrollColumn.translate
      }
    }

    const handleTouchend = (event: TouchEvent, scrollColumn: ScrollColumn) => {
      scrollColumn.touching = false
      scrollColumn.scrolling = true
      scrollColumn.prevY = undefined
      const distance = scrollColumn.translate - (scrollColumn.momentumPrevY as number)
      const duration = performance.now() - scrollColumn.momentumTime
      const shouldMomentum = Math.abs(distance) >= MOMENTUM_ALLOW_DISTANCE && duration <= MOMENTUM_RECORD_TIME

      shouldMomentum && momentum(scrollColumn, distance, duration)

      scrollColumn.index = getIndex(scrollColumn)
      scrollTo(scrollColumn, scrollColumn.index, shouldMomentum ? 1000 : 200)
    }

    const handleTransitionend = (scrollColumn: ScrollColumn) => {
      scrollColumn.scrolling = false
      change(scrollColumn)
    }

    const normalizeNormalColumns = (normalColumns: NormalColumn[]) => {
      return normalColumns.map((column: NormalColumn | any[]) => {
        const normalColumn = (isArray(column) ? { texts: column } : column) as NormalColumn
        const scrollColumn: ScrollColumn = {
          prevY: undefined,
          momentumPrevY: undefined,
          touching: false,
          translate: center.value,
          index: normalColumn.initialIndex ?? 0,
          duration: 0,
          momentumTime: 0,
          column: normalColumn,
          scrollEl: null,
          scrolling: false,
        }
        scrollTo(scrollColumn, scrollColumn.index, 200)
        return scrollColumn
      })
    }

    const normalizeCascadeColumns = (cascadeColumns: CascadeColumn[]) => {
      const scrollColumns: ScrollColumn[] = []

      createChildren(scrollColumns, cascadeColumns)

      return scrollColumns
    }

    const createChildren = (scrollColumns: ScrollColumn[], children: CascadeColumn[]) => {
      if (isArray(children) && children.length) {
        const scrollColumn: ScrollColumn = {
          prevY: undefined,
          momentumPrevY: undefined,
          touching: false,
          translate: center.value,
          index: 0,
          duration: 0,
          momentumTime: 0,
          column: {
            texts: children.map((cascadeColumn) => cascadeColumn[props.textKey]),
          },
          columns: children,
          scrollEl: null,
          scrolling: false,
        }

        scrollColumns.push(scrollColumn)
        createChildren(scrollColumns, (scrollColumn.columns as CascadeColumn[])[scrollColumn.index].children)
      }
    }

    const change = (scrollColumn: ScrollColumn) => {
      if (props.cascade) {
        scrollColumns.value.splice(scrollColumns.value.indexOf(scrollColumn) + 1)
        createChildren(scrollColumns.value, (scrollColumn.columns as CascadeColumn[])[scrollColumn.index].children)
      }

      if (scrollColumns.value.some((scrollColumn) => scrollColumn.scrolling)) {
        return
      }

      const { texts, indexes } = getPicked()

      const noChange = indexes.every((index, idx) => index === prevIndexes[idx])
      if (noChange) {
        return
      }
      prevIndexes = [...indexes]
      props.onChange?.(texts, indexes)
    }

    const stopScroll = () => {
      scrollColumns.value.forEach((scrollColumn) => {
        scrollColumn.duration = 0
        scrollColumn.translate = getTranslate(scrollColumn.scrollEl as HTMLElement)
        scrollColumn.index = getIndex(scrollColumn)
        scrollTo(scrollColumn, scrollColumn.index, 0)
      })
    }

    const confirm = () => {
      stopScroll()

      const { texts, indexes } = getPicked()
      prevIndexes = [...indexes]
      props.onConfirm?.(texts, indexes)
    }

    const cancel = () => {
      stopScroll()

      const { texts, indexes } = getPicked()
      prevIndexes = [...indexes]
      props.onCancel?.(texts, indexes)
    }

    watch(
      () => props.columns,
      (newValue: any) => {
        scrollColumns.value = props.cascade
          ? normalizeCascadeColumns(toRaw(newValue) as CascadeColumn[])
          : normalizeNormalColumns(toRaw(newValue) as NormalColumn[] | any[])
      },
      { immediate: true }
    )

    return {
      scrollColumns,
      columnHeight,
      center,
      scrollerEls,
      Transition,
      handleTouchstart,
      handleTouchmove,
      handleTouchend,
      handleTransitionend,
      confirm,
      cancel,
    }
  },
})
</script>

<style lang="less">
@import './picker';
</style>