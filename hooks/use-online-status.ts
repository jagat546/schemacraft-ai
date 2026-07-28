import * as React from "react"

function getOnlineStatus(): boolean {
  // SSR/build has no `navigator` -- default to online so a server-rendered
  // page never shows an offline banner before the client has a chance to
  // check for itself.
  return typeof navigator === "undefined" ? true : navigator.onLine
}

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = React.useState<boolean>(getOnlineStatus)

  React.useEffect(() => {
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)

    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)

    return () => {
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
    }
  }, [])

  return isOnline
}
