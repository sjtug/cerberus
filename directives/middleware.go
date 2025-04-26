package directives

import (
	"context"
	"crypto/subtle"
	"errors"
	"fmt"
	"net"
	"net/http"

	"github.com/a-h/templ"
	"github.com/caddyserver/caddy/v2"
	"github.com/caddyserver/caddy/v2/modules/caddyhttp"
	"github.com/golang-jwt/jwt/v5"
	"github.com/sjtug/cerberus/core"
	"github.com/sjtug/cerberus/internal/ipblock"
	"github.com/sjtug/cerberus/web"
	"go.uber.org/zap"
)

// Middleware is the actual middleware that will be used to challenge requests.
type Middleware struct {
	// The base URL for the challenge. It must be the same as the deployed endpoint route.
	BaseURL string `json:"base_url,omitempty"`

	instance *core.Instance
	logger   *zap.Logger
}

func getClientIP(r *http.Request) string {
	address := caddyhttp.GetVar(r.Context(), caddyhttp.ClientIPVarKey).(string)
	clientIP, _, err := net.SplitHostPort(address)
	if err != nil {
		clientIP = address // no port
	}

	return clientIP
}

func (m *Middleware) invokeAuth(w http.ResponseWriter, r *http.Request) error {
	c := m.instance

	ipBlockRaw := caddyhttp.GetVar(r.Context(), core.VarName)
	if ipBlockRaw != nil {
		ipBlock := ipBlockRaw.(ipblock.IPBlock)

		count := c.IncPending(ipBlock)
		if count > c.MaxPending {
			m.logger.Info(
				"Max failed/active challenges reached for IP block, rejecting",
				zap.String("ip", ipBlock.ToIPNet(c.PrefixCfg).String()),
			)
			c.InsertBlocklist(ipBlock)
			c.RemovePending(ipBlock)

			respondFailure(w, r, &c.Config, "IP blocked", true, http.StatusForbidden, m.BaseURL)
			return nil
		}
	}

	clearCookie(w, c.CookieName)

	challenge, err := challengeFor(r, c)
	if err != nil {
		m.logger.Error("failed to calculate challenge", zap.Error(err))
		return err
	}

	ctx := templ.WithChildren(
		context.WithValue(context.WithValue(r.Context(), web.BaseURLCtxKey, m.BaseURL), web.VersionCtxKey, core.Version),
		web.Challenge(challenge, c.Difficulty),
	)
	templ.Handler(
		web.Base(c.Title),
	).ServeHTTP(w, r.WithContext(ctx))

	return nil
}

func (m *Middleware) secondaryScreen(r *http.Request, token *jwt.Token) (bool, error) {
	c := m.instance

	claims := token.Claims.(jwt.MapClaims)

	challenge, ok := claims["challenge"].(string)
	if !ok {
		m.logger.Info("token does not contain valid challenge claim")
		return false, nil
	}

	expected, err := challengeFor(r, c)
	if err != nil {
		m.logger.Error("failed to calculate challenge", zap.Error(err))
		return false, err
	}

	if challenge != expected {
		m.logger.Info("challenge mismatch", zap.String("expected", expected), zap.String("actual", challenge))
		return false, nil
	}

	var nonce int
	if v, ok := claims["nonce"].(float64); ok {
		nonce = int(v)
	}

	response, ok := claims["response"].(string)
	if !ok {
		m.logger.Info("token does not contain valid response claim")
		return false, nil
	}

	answer, err := sha256sum(fmt.Sprintf("%s%d", challenge, nonce))
	if err != nil {
		m.logger.Error("failed to calculate answer", zap.Error(err))
		return false, err
	}
	if subtle.ConstantTimeCompare([]byte(answer), []byte(response)) != 1 {
		m.logger.Debug("response mismatch", zap.String("expected", answer), zap.String("actual", response))
		return false, nil
	}

	return true, nil
}

func (m *Middleware) ServeHTTP(w http.ResponseWriter, r *http.Request, next caddyhttp.Handler) error {
	c := m.instance

	if ipBlock, err := ipblock.NewIPBlock(net.ParseIP(getClientIP(r)), c.PrefixCfg); err == nil {
		caddyhttp.SetVar(r.Context(), core.VarName, ipBlock)
		if c.ContainsBlocklist(ipBlock) {
			m.logger.Debug("IP is blocked", zap.String("ip", ipBlock.ToIPNet(c.PrefixCfg).String()))
			respondFailure(w, r, &c.Config, "IP blocked", true, http.StatusForbidden, m.BaseURL)
			return nil
		}
	}

	// Get the "cerberus-auth" cookie
	cookie, err := r.Cookie(c.CookieName)
	if err != nil {
		m.logger.Debug("cookie not found", zap.Error(err))
		return m.invokeAuth(w, r)
	}

	if err := validateCookie(cookie); err != nil {
		m.logger.Debug("invalid cookie", zap.Error(err))
		return m.invokeAuth(w, r)
	}

	token, err := jwt.ParseWithClaims(cookie.Value, jwt.MapClaims{}, func(_ *jwt.Token) (interface{}, error) {
		return c.GetPublicKey(), nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodEdDSA.Alg()}))
	if err != nil {
		m.logger.Debug("invalid token", zap.Error(err))
	}

	if err := validateToken(token); err != nil {
		m.logger.Debug("invalid token", zap.Error(err))
		return m.invokeAuth(w, r)
	}

	// Now we know the user passed the challenge previously and thus we signed the result.
	// However, for security reasons we randomly decide to revalidate the challenge.
	if randomJitter() {
		// OK: Continue to the next handler
		w.Header().Set(c.HeaderName, "PASS-BRIEF")
		return next.ServeHTTP(w, r)
	}

	m.logger.Debug("selected for second challenge")
	ok, err := m.secondaryScreen(r, token)
	if err != nil {
		m.logger.Error("internal error during secondary screening", zap.Error(err))
		return err
	}

	if !ok {
		// OOPS: SSSS failed!
		m.logger.Warn("secondary screening failed: potential ill-behaved client")
		return m.invokeAuth(w, r)
	}

	// OK: Continue to the next handler
	w.Header().Set(c.HeaderName, "PASS-FULL")
	return next.ServeHTTP(w, r)
}

func (m *Middleware) Provision(ctx caddy.Context) error {
	m.logger = ctx.Logger()

	appRaw, err := ctx.App("cerberus")
	if err != nil {
		return err
	}
	app := appRaw.(*App)

	instance := app.GetInstance()
	if instance == nil {
		return errors.New("no global cerberus app found")
	}
	m.instance = instance

	return nil
}

func (m *Middleware) Validate() error {
	if m.BaseURL == "" {
		return fmt.Errorf("base_url is required")
	}
	return nil
}

func (Middleware) CaddyModule() caddy.ModuleInfo {
	return caddy.ModuleInfo{
		ID:  "http.handlers.cerberus",
		New: func() caddy.Module { return new(Middleware) },
	}
}

var (
	_ caddy.Provisioner           = (*Middleware)(nil)
	_ caddy.Validator             = (*Middleware)(nil)
	_ caddyhttp.MiddlewareHandler = (*Middleware)(nil)
)
