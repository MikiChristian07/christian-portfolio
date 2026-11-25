import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

if (process.env.NODE_ENV !== "production") {
  if (!posthogKey) {
    console.warn(
      "NEXT_PUBLIC_POSTHOG_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_KEY is configured",
    );
  }
  if (!posthogHost) {
    console.warn(
      "NEXT_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_HOST is configured",
    );
  }
}

const processors =
  posthogKey && posthogHost
    ? [
        new BatchLogRecordProcessor({
          exporter: new OTLPLogExporter({
            url: new URL("/i/v1/logs", posthogHost).toString(),
            timeoutMillis: 2_000,
            headers: {
              Authorization: `Bearer ${posthogKey}`,
              "Content-Type": "application/json",
            },
          }),
        }),
      ]
    : [];

export const posthogLogProvider = new LoggerProvider({
  resource: resourceFromAttributes({
    "service.name": "christianonovo",
    "deployment.environment": process.env.NODE_ENV ?? "development",
  }),
  processors,
});

// This logger is intentionally not global: only log records added by this integration are exported.
export const twinLog = posthogLogProvider.getLogger("posthog-twin-log-capture");

export function register() {
  // The provider is used directly by the dedicated logger above; existing application loggers stay untouched.
}
