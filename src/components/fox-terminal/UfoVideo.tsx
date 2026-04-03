import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

/**
 * UFO Video Component - Optimized for Large Files
 * Streams 395MB video progressively
 * Shows loading state while buffering
 */
export function UfoVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [bufferProgress, setBufferProgress] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    console.log("[UFO Video] Initializing video stream...");

    // Track buffering progress
    const updateBufferProgress = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(0);
        const duration = video.duration || 1;
        const progress = (bufferedEnd / duration) * 100;
        setBufferProgress(Math.min(progress, 100));

        // If we have at least 3 seconds buffered, we can start playing
        if (bufferedEnd >= 3 && !isPlaying) {
          console.log("[UFO Video] Sufficient buffer, starting playback");
          attemptPlay();
        }
      }
    };

    // Attempt to play video
    const attemptPlay = () => {
      video
        .play()
        .then(() => {
          console.log("[UFO Video] Playing successfully");
          setIsPlaying(true);
          setIsBuffering(false);
        })
        .catch((err) => {
          console.log("[UFO Video] Play attempt:", err.message);
          // Retry on user interaction
          document.addEventListener("click", attemptPlay, { once: true });
        });
    };

    // Event handlers
    const handleLoadedMetadata = () => {
      console.log("[UFO Video] Metadata loaded, duration:", video.duration);
      updateBufferProgress();
    };

    const handleProgress = () => {
      updateBufferProgress();
    };

    const handleCanPlay = () => {
      console.log("[UFO Video] Can play - enough data buffered");
      setIsBuffering(false);
      attemptPlay();
    };

    const handlePlaying = () => {
      console.log("[UFO Video] Video is playing");
      setIsPlaying(true);
      setIsBuffering(false);
    };

    const handleWaiting = () => {
      console.log("[UFO Video] Buffering...");
      setIsBuffering(true);
    };

    const handleError = () => {
      console.error("[UFO Video] Error:", video.error?.message);
    };

    // Add event listeners
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("progress", handleProgress);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("error", handleError);

    // Start loading
    video.load();

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("progress", handleProgress);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("error", handleError);
    };
  }, [isPlaying]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      {/* Video Element - Optimized for streaming */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        loop
        muted
        playsInline
        preload="auto"
        style={{
          opacity: isPlaying ? 1 : 0,
          transition: "opacity 0.5s ease-in-out",
        }}
      >
        <source src="/assets/ufo.mov" type="video/quicktime" />
      </video>

      {/* Loading Overlay - Shows while buffering */}
      {isBuffering && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="text-center space-y-6">
            {/* Animated UFO */}
            <motion.div
              animate={{
                y: [0, -15, 0],
                rotate: [0, 3, -3, 0],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="text-8xl"
            >
              🛸
            </motion.div>

            {/* Loading Text */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground font-mono">
                Incoming Transmission...
              </p>

              {/* Buffer Progress Bar */}
              {bufferProgress > 0 && (
                <div className="w-64 mx-auto">
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${bufferProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground/60 font-mono mt-1">
                    {Math.round(bufferProgress)}%
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
