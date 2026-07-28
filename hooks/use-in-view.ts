import * as React from "react"

// Fires once, then disconnects -- this is what makes "no re-trigger on
// scroll-back" (Landing-Experience-Specification.md §Animation Behavior)
// true by construction rather than by extra state tracking.
export function useInView<T extends Element>(): [React.RefObject<T | null>, boolean] {
  const ref = React.useRef<T>(null)
  const [inView, setInView] = React.useState(false)

  React.useEffect(() => {
    const node = ref.current
    if (!node || inView) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [inView])

  return [ref, inView]
}
