"use client"

import { useRef, type KeyboardEvent } from "react"
import { MinusIcon, PlusIcon, RotateCcwIcon } from "lucide-react"
import {
  TransformComponent,
  TransformWrapper,
  useControls,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const PAN_STEP_PX = 40

// Zoom buttons must live inside TransformWrapper to reach useControls()'s
// context — a separate component rather than inlining keeps that
// requirement from leaking into MermaidCanvas's own signature.
function ZoomControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls()

  return (
    <TooltipProvider>
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-md border bg-background/90 p-1 shadow-sm backdrop-blur-xs">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Zoom in"
                onClick={() => zoomIn()}
              />
            }
          >
            <PlusIcon />
          </TooltipTrigger>
          <TooltipContent>Zoom in</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Zoom out"
                onClick={() => zoomOut()}
              />
            }
          >
            <MinusIcon />
          </TooltipTrigger>
          <TooltipContent>Zoom out</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Reset zoom"
                onClick={() => resetTransform()}
              />
            }
          >
            <RotateCcwIcon />
          </TooltipTrigger>
          <TooltipContent>Reset zoom</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}

// Pan/zoom wrapper around MermaidViewer's rendered SVG (Engineering Spec
// §9, M5). The injected SVG itself has no inherent accessible name — role
// "img" + aria-label on the content gives it one; the outer region is
// separately focusable with its own arrow-key panning so keyboard users
// have a full equivalent to mouse drag/wheel-zoom, not just the buttons.
export function MermaidCanvas({ svg, label }: { svg: string; label: string }) {
  const transformRef = useRef<ReactZoomPanPinchRef>(null)

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const ref = transformRef.current
    if (!ref) return

    const { positionX, positionY, scale } = ref.state
    const pan = (dx: number, dy: number) =>
      ref.setTransform(positionX + dx, positionY + dy, scale, 150, "easeOut")

    switch (event.key) {
      case "ArrowUp":
        event.preventDefault()
        pan(0, PAN_STEP_PX)
        break
      case "ArrowDown":
        event.preventDefault()
        pan(0, -PAN_STEP_PX)
        break
      case "ArrowLeft":
        event.preventDefault()
        pan(PAN_STEP_PX, 0)
        break
      case "ArrowRight":
        event.preventDefault()
        pan(-PAN_STEP_PX, 0)
        break
    }
  }

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={`${label} viewer. Use arrow keys to pan, or the zoom buttons to zoom.`}
      className="relative h-full w-full overflow-hidden outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset"
    >
      <TransformWrapper ref={transformRef} minScale={0.5} maxScale={4} centerOnInit>
        <ZoomControls />
        <TransformComponent>
          <div
            role="img"
            aria-label={label}
            className="p-4 [&_svg]:h-auto [&_svg]:max-w-none"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </TransformComponent>
      </TransformWrapper>
    </div>
  )
}
