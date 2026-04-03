import { isRouteErrorResponse, useRouteError } from "react-router-dom";

function getErrorDetails(error: unknown): {
  statusCode: number;
  title: string;
  message: string;
  debugMessage?: string;
} {
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return {
        statusCode: 404,
        title: "Page Not Found",
        message: "The page you requested is unavailable.",
      };
    }

    return {
      statusCode: error.status,
      title: "Something Went Wrong",
      message: error.statusText || "An unexpected routing error occurred.",
    };
  }

  if (error instanceof Error) {
    return {
      statusCode: 500,
      title: "Something Went Wrong",
      message:
        "We hit an unexpected error while loading this screen. Please retry.",
      debugMessage: error.message,
    };
  }

  return {
    statusCode: 500,
    title: "Something Went Wrong",
    message:
      "We hit an unexpected error while loading this screen. Please retry.",
  };
}

export default function RouteErrorFallback() {
  const routeError = useRouteError();
  const details = getErrorDetails(routeError);

  if (import.meta.env.DEV) {
    console.error("[RouteErrorFallback] Caught route error:", routeError);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="relative min-h-screen overflow-hidden flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />

        <div className="relative z-10 w-full max-w-2xl rounded-xl border border-border/70 bg-card/80 backdrop-blur p-8 text-center shadow-xl">
          <p className="text-sm font-medium text-muted-foreground mb-2">
            Error {details.statusCode}
          </p>
          <h1 className="text-3xl font-bold text-foreground mb-3">
            {details.title}
          </h1>
          <p className="text-muted-foreground mb-6">{details.message}</p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
              onClick={() => window.location.assign("/")}
            >
              Go Home
            </button>
            <button
              type="button"
              className="px-6 py-2.5 rounded-lg border border-border bg-background text-foreground font-semibold hover:bg-muted transition-colors"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>

          {import.meta.env.DEV && details.debugMessage && (
            <p className="mt-6 text-xs text-left break-words text-muted-foreground">
              {details.debugMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
