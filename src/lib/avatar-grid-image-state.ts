export interface AvatarGridImageState {
  retryCount: number;
  retrySrc: string | null;
  exhausted: boolean;
}

export function appendAvatarRetryToken(
  src: string,
  retryToken: string,
): string {
  if (!src) {
    return src;
  }

  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}avatarRetry=${encodeURIComponent(retryToken)}`;
}

/**
 * First image load error retries the original URL once with a cache-bust token.
 * Second error marks the tile as exhausted so the UI can show a neutral placeholder.
 */
export function getNextAvatarGridImageState(params: {
  currentState?: AvatarGridImageState;
  originalSrc: string;
  retryToken: string;
}): AvatarGridImageState {
  const { currentState, originalSrc, retryToken } = params;

  if (!currentState || currentState.retryCount < 1) {
    return {
      retryCount: 1,
      retrySrc: appendAvatarRetryToken(originalSrc, retryToken),
      exhausted: false,
    };
  }

  if (currentState.exhausted) {
    return currentState;
  }

  return {
    retryCount: currentState.retryCount + 1,
    retrySrc: null,
    exhausted: true,
  };
}
