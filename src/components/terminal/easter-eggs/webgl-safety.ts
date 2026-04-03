import * as THREE from "three";

const BASE_RENDERER_ATTEMPTS: THREE.WebGLRendererParameters[] = [
  {
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  },
  {
    alpha: true,
    antialias: false,
    powerPreference: "default",
  },
];

function getRendererAttempts(): THREE.WebGLRendererParameters[] {
  const isFirefox =
    typeof navigator !== "undefined" &&
    /(firefox|fxios)/i.test(navigator.userAgent);

  if (!isFirefox) return BASE_RENDERER_ATTEMPTS;

  return [
    ...BASE_RENDERER_ATTEMPTS,
    {
      alpha: true,
      antialias: false,
      powerPreference: "low-power",
    },
  ];
}

export function createEasterEggRenderer(
  container: HTMLElement,
  label: string,
): THREE.WebGLRenderer | null {
  for (const attempt of getRendererAttempts()) {
    try {
      const renderer = new THREE.WebGLRenderer(attempt);
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setClearColor(0x000000, 0);
      container.appendChild(renderer.domElement);
      return renderer;
    } catch (error) {
      console.warn(
        `[Terminal Easter Egg] ${label} WebGL init attempt failed`,
        error,
      );
    }
  }

  console.warn(
    `[Terminal Easter Egg] ${label} WebGL unavailable, falling back gracefully`,
  );
  return null;
}

export function attachRendererFailureGuards(
  renderer: THREE.WebGLRenderer,
  label: string,
  onFailure: () => void,
): () => void {
  const canvas = renderer.domElement;

  const handleContextCreationError = () => {
    console.error(
      `[Terminal Easter Egg] ${label} failed during context creation`,
    );
    onFailure();
  };

  const handleContextLost = (event: Event) => {
    event.preventDefault();
    console.error(`[Terminal Easter Egg] ${label} lost WebGL context`);
    onFailure();
  };

  canvas.addEventListener(
    "webglcontextcreationerror",
    handleContextCreationError,
  );
  canvas.addEventListener("webglcontextlost", handleContextLost);

  return () => {
    canvas.removeEventListener(
      "webglcontextcreationerror",
      handleContextCreationError,
    );
    canvas.removeEventListener("webglcontextlost", handleContextLost);
  };
}

export function renderFrameSafely(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  label: string,
  onFailure: () => void,
): boolean {
  try {
    renderer.render(scene, camera);
    return true;
  } catch (error) {
    console.error(`[Terminal Easter Egg] ${label} render failure`, error);
    onFailure();
    return false;
  }
}
