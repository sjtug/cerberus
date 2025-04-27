package directives

import (
	"crypto/subtle"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/caddyserver/caddy/v2"
	"github.com/caddyserver/caddy/v2/modules/caddyhttp"
	"github.com/golang-jwt/jwt/v5"
	"github.com/sjtug/cerberus/core"
	"github.com/sjtug/cerberus/internal/ipblock"
	"github.com/sjtug/cerberus/web"
	"go.uber.org/zap"
)

// Endpoint is the handler that will be used to serve challenge endpoints and static files.
type Endpoint struct {
	instance *core.Instance
	logger   *zap.Logger
}

func (e *Endpoint) answerHandle(w http.ResponseWriter, r *http.Request) error {
	c := e.instance

	nonceStr := r.FormValue("nonce")
	if nonceStr == "" {
		e.logger.Info("nonce is empty")
		respondFailure(w, r, &c.Config, "nonce is empty", false, http.StatusBadRequest, ".")
		return nil
	}
	nonce64, err := strconv.ParseUint(nonceStr, 10, 32)
	if err != nil {
		e.logger.Debug("nonce is not an integer", zap.Error(err))
		respondFailure(w, r, &c.Config, "nonce is not an integer", false, http.StatusBadRequest, ".")
		return nil
	}
	nonce := uint32(nonce64)
	if !c.InsertUsedNonce(nonce) {
		e.logger.Info("nonce already used")
		respondFailure(w, r, &c.Config, "nonce already used", false, http.StatusBadRequest, ".")
		return nil
	}

	tsStr := r.FormValue("ts")
	if tsStr == "" {
		e.logger.Info("ts is empty")
		respondFailure(w, r, &c.Config, "ts is empty", false, http.StatusBadRequest, ".")
		return nil
	}
	ts, err := strconv.ParseInt(tsStr, 10, 64)
	if err != nil {
		e.logger.Debug("ts is not a integer", zap.Error(err))
		respondFailure(w, r, &c.Config, "ts is not a integer", false, http.StatusBadRequest, ".")
		return nil
	}
	now := time.Now().Unix()
	if ts < now-int64(core.NonceTTL) || ts > now {
		e.logger.Info("invalid ts", zap.Int64("ts", ts), zap.Int64("now", now))
		respondFailure(w, r, &c.Config, "invalid ts", false, http.StatusBadRequest, ".")
		return nil
	}

	signature := r.FormValue("signature")
	if signature == "" {
		e.logger.Info("signature is empty")
		respondFailure(w, r, &c.Config, "signature is empty", false, http.StatusBadRequest, ".")
		return nil
	}

	solutionStr := r.FormValue("solution")
	if solutionStr == "" {
		e.logger.Info("solution is empty")
		respondFailure(w, r, &c.Config, "solution is empty", false, http.StatusBadRequest, ".")
		return nil
	}
	solution, err := strconv.Atoi(solutionStr)
	if err != nil {
		e.logger.Debug("solution is not a integer", zap.Error(err))
		respondFailure(w, r, &c.Config, "solution is not a integer", false, http.StatusBadRequest, ".")
		return nil
	}

	response := r.FormValue("response")
	redir := r.FormValue("redir")

	challenge, err := challengeFor(r, c)
	if err != nil {
		e.logger.Error("failed to calculate challenge", zap.Error(err))
		return err
	}

	expectedSignature := calcSignature(challenge, nonce, ts, c)
	if signature != expectedSignature {
		e.logger.Debug("signature mismatch", zap.String("expected", expectedSignature), zap.String("actual", signature))
		respondFailure(w, r, &c.Config, "signature mismatch", false, http.StatusForbidden, ".")
		return nil
	}

	answer, err := blake3sum(fmt.Sprintf("%s|%d|%d|%s|%d", challenge, nonce, ts, signature, solution))
	if err != nil {
		e.logger.Error("failed to calculate answer", zap.Error(err))
		return err
	}

	if !strings.HasPrefix(response, strings.Repeat("0", c.Difficulty)) {
		clearCookie(w, c.CookieName)
		e.logger.Error("wrong response", zap.String("response", response), zap.Int("difficulty", c.Difficulty))
		respondFailure(w, r, &c.Config, "wrong response", false, http.StatusForbidden, ".")
		return nil
	}

	if subtle.ConstantTimeCompare([]byte(answer), []byte(response)) != 1 {
		clearCookie(w, c.CookieName)
		e.logger.Error("response mismatch", zap.String("expected", answer), zap.String("actual", response))
		respondFailure(w, r, &c.Config, "response mismatch", false, http.StatusForbidden, ".")
		return nil
	}

	// Now we know the user passed the challenge, we issue an approval and sign the result.
	approvalID := c.IssueApproval(c.AccessPerApproval)
	token := jwt.NewWithClaims(jwt.SigningMethodEdDSA, jwt.MapClaims{
		"challenge":   challenge,
		"response":    response,
		"approval_id": approvalID,
		"iat":         time.Now().Unix(),
		"nbf":         time.Now().Add(-time.Minute).Unix(),
		"exp":         time.Now().Add(c.ApprovalTTL).Unix(),
	})
	tokenStr, err := token.SignedString(c.GetPrivateKey())
	if err != nil {
		e.logger.Error("failed to sign token", zap.Error(err))
		return err
	}

	http.SetCookie(w, &http.Cookie{
		Name:     c.CookieName,
		Value:    tokenStr,
		Expires:  time.Now().Add(c.ApprovalTTL),
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
	})

	e.logger.Debug("user passed the challenge")

	ipBlockRaw := caddyhttp.GetVar(r.Context(), core.VarName)
	if ipBlockRaw != nil {
		ipBlock := ipBlockRaw.(ipblock.IPBlock)
		c.DecPending(ipBlock)
	}

	http.Redirect(w, r, redir, http.StatusSeeOther)
	return nil
}

// tryServeFile serves static files from the dist directory.
func tryServeFile(w http.ResponseWriter, r *http.Request) bool {
	if !strings.HasPrefix(r.URL.Path, "/static/") {
		return false
	}

	// Remove the /static/ prefix to get the actual file path
	filePath := strings.TrimSuffix(caddyhttp.SanitizedPathJoin("/dist/", strings.TrimPrefix(r.URL.Path, "/static/")), "/")

	// Add cache control headers for static assets
	w.Header().Set("Cache-Control", "public, max-age=31536000") // Cache for 1 year
	w.Header().Set("Vary", "Accept-Encoding")

	// Create a new request with the modified path
	req := *r
	req.URL.Path = filePath

	// Serve the file using http.FileServer
	http.FileServer(http.FS(web.Content)).ServeHTTP(w, &req)
	return true
}

func (e *Endpoint) ServeHTTP(w http.ResponseWriter, r *http.Request, _ caddyhttp.Handler) error {
	if tryServeFile(w, r) {
		return nil
	}

	c := e.instance

	path := strings.TrimSuffix(r.URL.Path, "/")
	if path == "/answer" && r.Method == http.MethodPost {
		return e.answerHandle(w, r)
	}

	respondFailure(w, r, &c.Config, "Not found", false, http.StatusNotFound, ".")
	return nil
}

func (e *Endpoint) Provision(ctx caddy.Context) error {
	e.logger = ctx.Logger()

	appRaw, err := ctx.App("cerberus")
	if err != nil {
		return err
	}
	app := appRaw.(*App)

	instance := app.GetInstance()
	if instance == nil {
		return errors.New("no global cerberus app found")
	}
	e.instance = instance

	return nil
}

func (Endpoint) CaddyModule() caddy.ModuleInfo {
	return caddy.ModuleInfo{
		ID:  "http.handlers.cerberus_endpoint",
		New: func() caddy.Module { return new(Endpoint) },
	}
}

var (
	_ caddy.Provisioner           = (*Endpoint)(nil)
	_ caddyhttp.MiddlewareHandler = (*Endpoint)(nil)
)
