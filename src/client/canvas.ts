import type { ILeaferConfig } from 'leafer-ui'

export const PAGEFLOW_CANVAS_CONFIG = {
  type: 'viewport',
  zoom: { min: 0.05, max: 32 },
  wheel: { zoomMode: true, preventDefault: true },
  move: {
    drag: true,
    dragEmpty: true,
    holdMiddleKey: true,
    holdSpaceKey: true,
  },
} satisfies ILeaferConfig
