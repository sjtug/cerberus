package directives

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/a-h/templ"
	"github.com/golang-jwt/jwt/v5"
	"github.com/sjtug/cerberus/core"
	"github.com/sjtug/cerberus/web"
)

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

func sha256sum(text string) (string, error) {
	hash := sha256.New()
	_, err := hash.Write([]byte(text))
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(hash.Sum(nil)), nil
}

func challengeFor(r *http.Request, c *core.Instance) (string, error) {
	fp := c.GetFingerprint()

	payload := fmt.Sprintf("Accept-Language=%s,X-Real-IP=%s,User-Agent=%s,WeekTime=%s,Fingerprint=%s,Difficulty=%d",
		r.Header.Get("Accept-Language"),
		getClientIP(r),
		r.Header.Get("User-Agent"),
		time.Now().UTC().Round(24*7*time.Hour).Format(time.RFC3339),
		fp,
		c.Difficulty,
	)

	return sha256sum(payload)
}

func respondFailure(w http.ResponseWriter, r *http.Request, c *core.Config, msg string, blocked bool, status int, baseURL string) {
	if blocked {
		if c.Drop {
			// Drop the connection
			panic(http.ErrAbortHandler)
		}
		w.Header().Set(c.HeaderName, "BLOCK")
		// Close the connection to the client
		r.Close = true
		w.Header().Set("Connection", "close")
	} else {
		w.Header().Set(c.HeaderName, "FAIL")
	}

	ctx := templ.WithChildren(
		context.WithValue(context.WithValue(r.Context(), web.BaseURLCtxKey, baseURL), web.VersionCtxKey, core.Version),
		web.Error(msg, c.Mail),
	)
	templ.Handler(
		web.Base(c.Title),
		templ.WithStatus(status),
	).ServeHTTP(w, r.WithContext(ctx))
}
