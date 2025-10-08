package directives

import (
	"context"
	"crypto/ed25519"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/a-h/templ"
	"github.com/caddyserver/caddy/v2/modules/caddyhttp"
	"github.com/getsentry/sentry-go"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/invopop/ctxi18n"
	"github.com/invopop/ctxi18n/i18n"
	"github.com/sjtug/cerberus/core"
	"github.com/sjtug/cerberus/web"
	"github.com/zeebo/blake3"
)

const (
	IV1 = "/L4y6KgWa8vHEujU3O6JyI8osQxwh1nE0Eoay4nD3vw/y36eSFT0s/GTGfrngN6+"
	IV2 = "KHo5hHR3ZfisR7xeG1gJwO3LSc1cYyDUQ5+StoAjV8jLhp01NBNi4joHYTWXDqF0"
)

// CaptureError captures an error with context for telemetry
func CaptureError(r *http.Request, err error, eventType string, extra map[string]interface{}) {
	// Get request ID if available
	reqID := ""
	if id := caddyhttp.GetVar(r.Context(), core.VarReqID); id != nil {
		reqID = id.(string)
	}

	// Create a new hub with the request context
	hub := sentry.GetHubFromContext(r.Context())
	if hub == nil {
		hub = sentry.CurrentHub().Clone()
	}

	// Set request context
	hub.ConfigureScope(func(scope *sentry.Scope) {
		scope.SetRequest(r)
		scope.SetTag("event_type", eventType)
		scope.SetTag("request_id", reqID)
		scope.SetContext("cerberus", map[string]interface{}{
			"event_type": eventType,
			"request_id": reqID,
		})

		// Add extra context if provided
		if extra != nil {
			for k, v := range extra {
				scope.SetExtra(k, v)
			}
		}
	})

	hub.CaptureException(err)
}

// CaptureMessage captures a message with context for telemetry
func CaptureMessage(r *http.Request, message string, level sentry.Level, eventType string, extra map[string]interface{}) {
	// Get request ID if available
	reqID := ""
	if id := caddyhttp.GetVar(r.Context(), core.VarReqID); id != nil {
		reqID = id.(string)
	}

	// Create a new hub with the request context
	hub := sentry.GetHubFromContext(r.Context())
	if hub == nil {
		hub = sentry.CurrentHub().Clone()
	}

	// Set request context
	hub.ConfigureScope(func(scope *sentry.Scope) {
		scope.SetRequest(r)
		scope.SetTag("event_type", eventType)
		scope.SetTag("request_id", reqID)
		scope.SetContext("cerberus", map[string]interface{}{
			"event_type": eventType,
			"request_id": reqID,
		})

		// Add extra context if provided
		if extra != nil {
			for k, v := range extra {
				scope.SetExtra(k, v)
			}
		}
	})

	hub.WithScope(func(scope *sentry.Scope) {
		scope.SetLevel(level)
		hub.CaptureMessage(message)
	})
}

func clearCookie(w http.ResponseWriter, cookieName string) {
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    "",
		Expires:  time.Now().Add(-time.Hour),
		MaxAge:   -1,
		SameSite: http.SameSiteLaxMode,
	})
}

func validateCookie(cookie *http.Cookie) error {
	if err := cookie.Valid(); err != nil {
		return err
	}

	if time.Now().After(cookie.Expires) && !cookie.Expires.IsZero() {
		return errors.New("cookie expired")
	}

	return nil
}

func validateToken(token *jwt.Token) error {
	if token == nil {
		return fmt.Errorf("token is nil")
	}

	if !token.Valid {
		return fmt.Errorf("token is not valid")
	}

	claims := token.Claims.(jwt.MapClaims)

	exp, ok := claims["exp"].(float64)
	if !ok {
		return fmt.Errorf("token does not contain exp claim")
	}

	if exp := time.Unix(int64(exp), 0); exp.Before(time.Now()) {
		return fmt.Errorf("token expired at %s", exp)
	}

	return nil
}

func blake3sum(text string) (string, error) {
	hash := blake3.New()
	_, err := hash.WriteString(text)
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(hash.Sum(nil)), nil
}

func challengeFor(r *http.Request, c *core.Instance) (string, error) {
	fp := c.GetFingerprint()

	payload := fmt.Sprintf("Accept-Language=%s,X-Real-IP=%s,User-Agent=%s,Fingerprint=%s,Difficulty=%d,IV=%s",
		r.Header.Get("Accept-Language"),
		getClientIP(r),
		r.Header.Get("User-Agent"),
		fp,
		c.Difficulty,
		IV1,
	)

	return blake3sum(payload)
}

func calcSignature(challenge string, nonce uint32, ts int64, c *core.Instance) string {
	payload := fmt.Sprintf("Challenge=%s,Nonce=%d,TS=%d,IV=%s", challenge, nonce, ts, IV2)

	signature := ed25519.Sign(c.GetPrivateKey(), []byte(payload))
	return hex.EncodeToString(signature)
}

func respondFailure(w http.ResponseWriter, r *http.Request, c *core.Config, msg string, blocked bool, status int, baseURL string) error {
	// Do not cache failure responses.
	w.Header().Set("Cache-Control", "no-cache")

	if blocked {
		if c.Drop {
			// Drop the connection
			panic(http.ErrAbortHandler)
		}
		w.Header().Set(c.HeaderName, "BLOCKED")
		// Close the connection to the client
		r.Close = true
		w.Header().Set("Connection", "close")
		return renderTemplate(w, r, c, baseURL,
			i18n.T(r.Context(), "error.access_restricted"),
			web.Error(
				i18n.T(r.Context(), "error.ip_blocked"),
				i18n.T(r.Context(), "error.wait_before_retry"),
				"",
			),
			templ.WithStatus(status),
		)
	}

	w.Header().Set(c.HeaderName, "FAIL")
	return renderTemplate(w, r, c, baseURL,
		i18n.T(r.Context(), "error.error_occurred"),
		web.Error(
			i18n.T(r.Context(), "error.server_error"),
			i18n.T(r.Context(), "error.browser_config_or_bug"),
			i18n.T(r.Context(), "error.error_details", i18n.M{"error": msg}),
		),
		templ.WithStatus(status),
	)
}

func setupLocale(r *http.Request) (*http.Request, error) {
	locale := r.Header.Get("Accept-Language")
	if locale == "" {
		locale = "en"
	}

	ctx, err := ctxi18n.WithLocale(r.Context(), locale)
	if err != nil {
		return nil, err
	}

	ctx = context.WithValue(ctx, web.LocaleCtxKey, locale)

	return r.WithContext(ctx), nil
}

func setupRequestID(r *http.Request) *http.Request {
	id := uuid.New().String()
	caddyhttp.SetVar(r.Context(), core.VarReqID, id)
	return r
}

func setupManifest(r *http.Request) *http.Request {
	manifest, err := web.LoadManifest()
	if err != nil {
		panic(err)
	}

	return r.WithContext(context.WithValue(r.Context(), web.ManifestCtxKey, manifest))
}

func renderTemplate(w http.ResponseWriter, r *http.Request, c *core.Config, baseURL string, header string, child templ.Component, opts ...func(*templ.ComponentHandler)) error {
	telemetryConfig := web.TelemetryConfig{}
	if c.TelemetryEnabled {
		telemetryConfig.FrontendDSN = c.TelemetryFrontendDSN
		telemetryConfig.Environment = c.TelemetryEnvironment
		telemetryConfig.SampleRate = c.TelemetrySampleRate
	}

	ctx := templ.WithChildren(
		context.WithValue(
			context.WithValue(
				context.WithValue(
					context.WithValue(r.Context(), web.BaseURLCtxKey, baseURL),
					web.VersionCtxKey,
					core.Version,
				),
				web.MailCtxKey,
				c.Mail,
			),
			web.TelemetryCtxKey,
			telemetryConfig,
		),
		child,
	)
	templ.Handler(
		web.Base(c.Title, header),
		opts...,
	).ServeHTTP(w, r.WithContext(ctx))
	return nil
}
