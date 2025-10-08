package directives

import (
	"time"

	"github.com/caddyserver/caddy/v2"
	"github.com/getsentry/sentry-go"
	"github.com/sjtug/cerberus/core"
	"go.uber.org/zap"
)

// App is the global configuration for cerberus.
// There can only be one cerberus app in the entire Caddy runtime.
type App struct {
	core.Config
	instance *core.Instance
}

func (c *App) GetInstance() *core.Instance {
	return c.instance
}

func (c *App) Provision(context caddy.Context) error {
	err := c.Config.Provision(context.Logger())
	if err != nil {
		return err
	}

	// Initialize Sentry for backend telemetry if enabled
	if c.Config.TelemetryEnabled && c.Config.TelemetryBackendDSN != "" {
		err := sentry.Init(sentry.ClientOptions{
			Dsn:              c.Config.TelemetryBackendDSN,
			Environment:      c.Config.TelemetryEnvironment,
			SampleRate:       1.0, // Always capture all events (100%)
			TracesSampleRate: 0,   // Disable tracing
			AttachStacktrace: true,
			BeforeSend: func(event *sentry.Event, hint *sentry.EventHint) *sentry.Event {
				// Scrub any PII from the event
				// Remove any IP addresses from the event
				if event.User.IPAddress != "" {
					event.User.IPAddress = ""
				}
				// Remove sensitive headers
				if event.Request != nil {
					delete(event.Request.Headers, "Cookie")
					delete(event.Request.Headers, "Authorization")
					delete(event.Request.Headers, "X-Forwarded-For")
					delete(event.Request.Headers, "X-Real-IP")
				}
				return event
			},
		})
		if err != nil {
			context.Logger().Error("failed to initialize Sentry", zap.Error(err))
			// Continue without telemetry rather than failing
			c.Config.TelemetryEnabled = false
		} else {
			context.Logger().Info("telemetry initialized",
				zap.String("environment", c.Config.TelemetryEnvironment),
				zap.Float64("sample_rate", c.Config.TelemetrySampleRate))
		}
	}

	context.Logger().Debug("cerberus instance provision")

	instance, err := core.GetInstance(c.Config, context.Logger())
	if err != nil {
		return err
	}

	c.instance = instance

	return nil
}

func (c *App) Validate() error {
	return c.Config.Validate()
}

func (c *App) Start() error {
	return nil
}

func (c *App) Stop() error {
	// Flush any pending Sentry events before shutdown
	if c.Config.TelemetryEnabled {
		sentry.Flush(2 * time.Second)
	}
	return nil
}

func (App) CaddyModule() caddy.ModuleInfo {
	return caddy.ModuleInfo{
		ID:  "cerberus",
		New: func() caddy.Module { return new(App) },
	}
}

var (
	_ caddy.App         = (*App)(nil)
	_ caddy.Provisioner = (*App)(nil)
	_ caddy.Validator   = (*App)(nil)
)
