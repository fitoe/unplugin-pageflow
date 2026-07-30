import type { ILeaferConfig } from 'leafer-ui'

export interface PageFlowWheelInput {
  deltaX: number
  deltaY: number
  altKey?: boolean
  ctrlKey?: boolean
  shiftKey?: boolean
  metaKey?: boolean
}

export interface PageFlowWheelInteraction {
  getLocal(point: { clientX: number, clientY: number }): { x: number, y: number }
  wheel(data: PageFlowWheelInput & { x: number, y: number, time: number }): void
}

export const PAGEFLOW_CANVAS_CONFIG = {
  type: 'viewport',
  zoom: { min: 0.05, max: 32 },
  wheel: { zoomMode: true, zoomSpeed: 0.025, preventDefault: true },
  move: {
    drag: true,
    dragEmpty: true,
    holdMiddleKey: true,
    holdSpaceKey: true,
  },
} satisfies ILeaferConfig

export function forwardWheelToCanvas(
  interaction: PageFlowWheelInteraction | undefined,
  event: PageFlowWheelInput,
  clientX: number,
  clientY: number,
) {
  if (!interaction) return
  interaction.wheel({
    ...interaction.getLocal({ clientX, clientY }),
    deltaX: event.deltaX,
    deltaY: event.deltaY,
    altKey: event.altKey,
    ctrlKey: event.ctrlKey,
    shiftKey: event.shiftKey,
    metaKey: event.metaKey,
    time: Date.now(),
  })
}
