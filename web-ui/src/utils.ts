function detectPlatform(userAgent: string) {
    const ua = userAgent.toLowerCase()
    if (ua.includes("mac")) return "mac"
    if (ua.includes("win")) return "windows"
    if (ua.includes("linux")) return "linux"
    return "unknown"
  }

export function getPlatformSymbols() {
    if (typeof window === "undefined") {
      // Fallback for server-side rendering
      return {
        cmd: "⌘",
        command: "⌘",
        meta: "⌘",
        super: "⌘",
        ctrl: "Ctrl",
        control: "Ctrl",
        alt: "Alt",
        option: "Alt",
        shift: "Shift",
        mod: "Ctrl",
      }
    }
  
    const userAgent = navigator.userAgent
    const platform = detectPlatform(userAgent)
  
    if (platform === "mac") {
      return {
        cmd: "⌘",
        command: "⌘",
        meta: "⌘",
        super: "⌘",
        ctrl: "⌃",
        control: "⌃",
        alt: "⌥",
        option: "⌥",
        shift: "⇧",
        mod: "⌘",
      }
    } else if (platform === "windows") {
      return {
        cmd: "⊞",
        command: "⊞",
        meta: "⊞",
        super: "⊞",
        ctrl: "Ctrl",
        control: "Ctrl",
        alt: "Alt",
        option: "Alt",
        shift: "Shift",
        mod: "Ctrl",
      }
    } else {
      // Linux and other platforms
      return {
        cmd: "Super",
        command: "Super",
        meta: "Super",
        super: "Super",
        ctrl: "Ctrl",
        control: "Ctrl",
        alt: "Alt",
        option: "Alt",
        shift: "Shift",
        mod: "Ctrl",
      }
    }
  }
  
  export function getIsModKey(event: { metaKey: boolean; ctrlKey: boolean }) {
    if (typeof window === "undefined") return false
    const userAgent = navigator.userAgent
    const platform = detectPlatform(userAgent)
    return platform === "mac" ? event.metaKey : event.ctrlKey
  }