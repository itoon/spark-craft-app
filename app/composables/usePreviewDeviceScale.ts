import { computed, onBeforeUnmount, onMounted, ref, unref, type ComputedRef, type Ref } from 'vue'

import type { PreviewDeviceDef } from '~/composables/usePreviewDevices'

interface ScaleOptions {
  widthPadding?: number
  /** Space kept free below/above the phone; reactive when the space changes */
  heightPadding?: number | Ref<number> | ComputedRef<number>
  minWidth?: number
  minHeight?: number
  /** Allow growing past native size on big screens (default 1 = never grow) */
  maxScale?: number
}

export function usePreviewDeviceScale(
  containerRef: Ref<HTMLElement | null>,
  activeDevice: ComputedRef<PreviewDeviceDef>,
  options: ScaleOptions = {}
) {
  const containerWidth = ref(1200)
  const containerHeight = ref(900)
  let resizeObserver: ResizeObserver | null = null

  function updateContainerSize() {
    if (!containerRef.value) return
    containerWidth.value = containerRef.value.clientWidth
    containerHeight.value = containerRef.value.clientHeight
  }

  const scale = computed(() => {
    const availableWidth = Math.max(
      options.minWidth ?? 280,
      containerWidth.value - (options.widthPadding ?? 48)
    )
    const availableHeight = Math.max(
      options.minHeight ?? 420,
      containerHeight.value - (unref(options.heightPadding) ?? 120)
    )

    return Math.min(
      options.maxScale ?? 1,
      availableWidth / activeDevice.value.totalW,
      availableHeight / activeDevice.value.totalH
    )
  })

  onMounted(() => {
    updateContainerSize()
    if (!containerRef.value) return

    resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      containerWidth.value = entry.contentRect.width
      containerHeight.value = entry.contentRect.height
    })
    resizeObserver.observe(containerRef.value)
  })

  onBeforeUnmount(() => {
    resizeObserver?.disconnect()
  })

  return {
    containerWidth,
    containerHeight,
    scale,
    updateContainerSize,
  }
}
