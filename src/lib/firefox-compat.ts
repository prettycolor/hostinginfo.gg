/**
 * Firefox-only compatibility shims.
 *
 * Prevents deprecated WEBGL_debug_renderer_info extension access from
 * generating console noise in Firefox. Any caller receives null, which is
 * already the normal "extension unavailable" behavior libraries should handle.
 */
export function applyFirefoxWebGLCompatibilityPatch(): void {
  if (typeof window === "undefined" || typeof navigator === "undefined") return;
  if (!/firefox/i.test(navigator.userAgent)) return;

  try {
    document.documentElement.classList.add("is-firefox");
  } catch {
    // no-op: marker class should never break startup
  }

  const patchFlag = "__htWebglDebugExtPatched__";
  type PatchableWebGLPrototype = {
    getExtension?: (name: string) => unknown;
  } & Record<string, unknown>;

  const patchPrototype = (proto?: PatchableWebGLPrototype) => {
    if (!proto || typeof proto.getExtension !== "function" || proto[patchFlag])
      return;

    const originalGetExtension = proto.getExtension;
    proto.getExtension = function patchedGetExtension(name: string) {
      if (name === "WEBGL_debug_renderer_info") {
        return null;
      }
      return originalGetExtension.call(this as never, name);
    };
    proto[patchFlag] = true;
  };

  try {
    const globalWebGL = globalThis as {
      WebGLRenderingContext?: { prototype?: PatchableWebGLPrototype };
      WebGL2RenderingContext?: { prototype?: PatchableWebGLPrototype };
    };
    patchPrototype(globalWebGL.WebGLRenderingContext?.prototype);
    patchPrototype(globalWebGL.WebGL2RenderingContext?.prototype);
  } catch {
    // no-op: compatibility patch must never break app startup
  }
}
