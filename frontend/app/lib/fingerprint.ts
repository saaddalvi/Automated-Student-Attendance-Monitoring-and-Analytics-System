/**
 * Browser Fingerprinting Module (Layer 2 Anti-Proxy Defense)
 *
 * Gathers hardware, rendering, audio, and platform signals into a composite
 * deterministic SHA-256 fingerprint hash.
 *
 * Components sampled:
 * 1. Canvas 2D Rendering (font rasterization, emoji rendering, alpha blending, shadow blur)
 * 2. WebGL GPU vendor, renderer, and hardware capabilities
 * 3. Web Audio synthesis buffer characteristics
 * 4. Hardware specifications (CPU cores, memory, touch points, screen geometry)
 *
 * Stops: DevTools UUID copy-paste across different physical machines/browsers.
 */

let cachedFingerprintHash: string | null = null;
let cachedSignals: Record<string, unknown> | null = null;

/**
 * Generates Canvas 2D rendering fingerprint
 */
function getCanvasFingerprint(): string {
  try {
    if (typeof document === "undefined") return "";
    const canvas = document.createElement("canvas");
    canvas.width = 240;
    canvas.height = 60;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    // Text with different fonts and styling
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial', 'Helvetica', sans-serif";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);

    // Multi-style colored text
    ctx.fillStyle = "#069";
    ctx.fillText("AttendEase,🔒@2026", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("AttendEase,🔒@2026", 4, 17);

    // Emoji rendering (drastically differs across OS / GPU font engines)
    ctx.font = "18px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji'";
    ctx.fillText("🎓📱🛡️⚡", 100, 42);

    // Canvas arc and composite operations
    ctx.beginPath();
    ctx.arc(50, 40, 15, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fillStyle = "rgba(79, 70, 229, 0.6)";
    ctx.fill();

    return canvas.toDataURL();
  } catch {
    return "canvas-error";
  }
}

/**
 * Generates WebGL GPU vendor, unmasked renderer, and shader capability signals
 */
function getWebGLFingerprint(): {
  vendor: string;
  renderer: string;
  shadingVersion: string;
  maxTextureSize: number;
} {
  const result = {
    vendor: "unavailable",
    renderer: "unavailable",
    shadingVersion: "unavailable",
    maxTextureSize: 0,
  };

  try {
    if (typeof document === "undefined") return result;
    const canvas = document.createElement("canvas");
    const gl =
      (canvas.getContext("webgl") as WebGLRenderingContext | null) ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);

    if (!gl) return result;

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (debugInfo) {
      result.vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || "unknown";
      result.renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "unknown";
    }

    result.shadingVersion = gl.getParameter(gl.SHADING_LANGUAGE_VERSION) || "";
    result.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 0;
  } catch {
    // WebGL not supported or disabled
  }

  return result;
}

/**
 * Generates Audio Context synthesis characteristics
 */
async function getAudioFingerprint(): Promise<string> {
  try {
    if (typeof window === "undefined") return "";
    const AudioCtx =
      window.OfflineAudioContext ||
      (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;

    if (!AudioCtx) return "audio-unsupported";

    const context = new AudioCtx(1, 44100, 44100);
    const oscillator = context.createOscillator();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(10000, context.currentTime);

    const compressor = context.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-50, context.currentTime);
    compressor.knee.setValueAtTime(40, context.currentTime);
    compressor.ratio.setValueAtTime(12, context.currentTime);
    compressor.attack.setValueAtTime(0, context.currentTime);
    compressor.release.setValueAtTime(0.25, context.currentTime);

    oscillator.connect(compressor);
    compressor.connect(context.destination);

    oscillator.start(0);
    const audioBuffer = await context.startRendering();

    // Sum audio buffer samples for a quick deterministic fingerprint
    const channelData = audioBuffer.getChannelData(0);
    let sum = 0;
    for (let i = 4500; i < 5000; i++) {
      sum += Math.abs(channelData[i]);
    }
    return sum.toFixed(6);
  } catch {
    return "audio-error";
  }
}

/**
 * Collects all hardware and browser environment parameters
 */
export async function collectDeviceSignals(): Promise<Record<string, unknown>> {
  if (typeof window === "undefined") {
    return { userAgent: "", platform: "", timezone: "UTC" };
  }

  const canvasData = getCanvasFingerprint();
  const webgl = getWebGLFingerprint();
  const audioHash = await getAudioFingerprint();

  const signals = {
    userAgent: navigator.userAgent || "",
    platform: navigator.platform || "",
    language: navigator.language || "",
    languages: navigator.languages ? Array.from(navigator.languages) : [],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    timezoneOffset: new Date().getTimezoneOffset(),
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      colorDepth: window.screen.colorDepth,
      pixelRatio: window.devicePixelRatio || 1,
    },
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: (navigator as unknown as { deviceMemory?: number }).deviceMemory || 0,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    webgl,
    audioHash,
    canvasLength: canvasData.length,
    canvasSample: canvasData.slice(0, 100),
  };

  cachedSignals = signals;
  return signals;
}

/**
 * Computes deterministic SHA-256 hash of device signals
 */
export async function getBrowserFingerprintHash(): Promise<string> {
  if (cachedFingerprintHash) return cachedFingerprintHash;
  if (typeof window === "undefined") return "";

  const signals = cachedSignals || (await collectDeviceSignals());

  // Deterministic JSON string of core hardware/rendering traits (excluding time)
  const coreTraits = {
    canvas: getCanvasFingerprint(),
    webgl: signals.webgl,
    audio: signals.audioHash,
    screen: signals.screen,
    hardwareConcurrency: signals.hardwareConcurrency,
    deviceMemory: signals.deviceMemory,
    maxTouchPoints: signals.maxTouchPoints,
    platform: signals.platform,
    timezone: signals.timezone,
  };

  const str = JSON.stringify(coreTraits);
  const buffer = new TextEncoder().encode(str);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hexHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  cachedFingerprintHash = hexHash;
  return hexHash;
}
