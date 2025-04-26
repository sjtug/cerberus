package directives

import (
	"time"

	"github.com/caddyserver/caddy/v2/caddyconfig"
	"github.com/caddyserver/caddy/v2/caddyconfig/caddyfile"
	"github.com/caddyserver/caddy/v2/caddyconfig/httpcaddyfile"
	"github.com/caddyserver/caddy/v2/modules/caddyhttp"
	"github.com/dustin/go-humanize"
	"github.com/sjtug/cerberus/core"
	"github.com/sjtug/cerberus/internal/ipblock"
)

func (c *App) UnmarshalCaddyfile(d *caddyfile.Dispenser) error {
	d.Next() // consume the directive

	for nesting := d.Nesting(); d.NextBlock(nesting); {
		switch d.Val() {
		case "difficulty":
			if !d.NextArg() {
				return d.ArgErr()
			}
			difficulty, ok := d.ScalarVal().(int)
			if !ok {
				return d.Errf("difficulty must be an integer")
			}
			c.Difficulty = difficulty
		case "drop":
			c.Drop = true
		case "max_pending":
			if !d.NextArg() {
				return d.ArgErr()
			}
			maxPending, ok := d.ScalarVal().(int)
			if !ok {
				return d.Errf("max_pending must be an integer")
			}
			c.MaxPending = int32(maxPending) // #nosec G115 -- trusted input
		case "access_per_approval":
			if !d.NextArg() {
				return d.ArgErr()
			}
			accessPerApproval, ok := d.ScalarVal().(int)
			if !ok {
				return d.Errf("access_per_approval must be an integer")
			}
			c.AccessPerApproval = int32(accessPerApproval) // #nosec G115 -- trusted input
		case "block_ttl":
			if !d.NextArg() {
				return d.ArgErr()
			}
			blockTTLRaw, ok := d.ScalarVal().(string)
			if !ok {
				return d.Errf("block_ttl must be a string")
			}
			blockTTL, err := time.ParseDuration(blockTTLRaw)
			if err != nil {
				return d.Errf("block_ttl must be a valid duration: %v", err)
			}
			c.BlockTTL = blockTTL
		case "pending_ttl":
			if !d.NextArg() {
				return d.ArgErr()
			}
			pendingTTLRaw, ok := d.ScalarVal().(string)
			if !ok {
				return d.Errf("pending_ttl must be a string")
			}
			pendingTTL, err := time.ParseDuration(pendingTTLRaw)
			if err != nil {
				return d.Errf("pending_ttl must be a valid duration: %v", err)
			}
			c.PendingTTL = pendingTTL
		case "approval_ttl":
			if !d.NextArg() {
				return d.ArgErr()
			}
			approvalTTLRaw, ok := d.ScalarVal().(string)
			if !ok {
				return d.Errf("approval_ttl must be a string")
			}
			approvalTTL, err := time.ParseDuration(approvalTTLRaw)
			if err != nil {
				return d.Errf("approval_ttl must be a valid duration: %v", err)
			}
			c.ApprovalTTL = approvalTTL
		case "max_mem_usage":
			if !d.NextArg() {
				return d.ArgErr()
			}
			maxMemUsageRaw, ok := d.ScalarVal().(string)
			if !ok {
				return d.Errf("max_mem_usage must be a string")
			}
			maxMemUsage, err := humanize.ParseBytes(maxMemUsageRaw)
			if err != nil {
				return d.Errf("max_mem_usage must be a valid size: %v", err)
			}
			c.MaxMemUsage = int64(maxMemUsage) // #nosec G115 -- trusted input
		case "cookie_name":
			if !d.NextArg() {
				return d.ArgErr()
			}
			cookieName, ok := d.ScalarVal().(string)
			if !ok {
				return d.Errf("cookie_name must be a string")
			}
			c.CookieName = cookieName
		case "header_name":
			if !d.NextArg() {
				return d.ArgErr()
			}
			headerName, ok := d.ScalarVal().(string)
			if !ok {
				return d.Errf("header_name must be a string")
			}
			c.HeaderName = headerName
		case "title":
			if !d.NextArg() {
				return d.ArgErr()
			}
			title, ok := d.ScalarVal().(string)
			if !ok {
				return d.Errf("title must be a string")
			}
			c.Title = title
		case "prefix_cfg":
			if !d.NextArg() {
				return d.ArgErr()
			}
			v4Prefix, ok := d.ScalarVal().(int)
			if !ok {
				return d.Errf("prefix_cfg must be followed by two integers")
			}
			if !d.NextArg() {
				return d.ArgErr()
			}
			v6Prefix, ok := d.ScalarVal().(int)
			if !ok {
				return d.Errf("prefix_cfg must be followed by two integers")
			}
			c.PrefixCfg = ipblock.Config{
				V4Prefix: v4Prefix,
				V6Prefix: v6Prefix,
			}
		case "mail":
			if !d.NextArg() {
				return d.ArgErr()
			}
			mail, ok := d.ScalarVal().(string)
			if !ok {
				return d.Errf("mail must be a string")
			}
			c.Mail = mail
		default:
			return d.Errf("unknown subdirective '%s'", d.Val())
		}
	}

	return nil
}

func ParseCaddyFileApp(d *caddyfile.Dispenser, _ any) (any, error) {
	var c App
	err := c.UnmarshalCaddyfile(d)
	return httpcaddyfile.App{
		Name:  core.AppName,
		Value: caddyconfig.JSON(c, nil),
	}, err
}

func (m *Middleware) UnmarshalCaddyfile(d *caddyfile.Dispenser) error {
	d.Next() // consume the directive

	for nesting := d.Nesting(); d.NextBlock(nesting); {
		switch d.Val() {
		case "base_url":
			if !d.NextArg() {
				return d.ArgErr()
			}
			baseURL, ok := d.ScalarVal().(string)
			if !ok {
				return d.Errf("base_url must be a string")
			}
			m.BaseURL = baseURL
		default:
			return d.Errf("unknown subdirective '%s'", d.Val())
		}
	}
	return nil
}

func ParseCaddyFileMiddleware(h httpcaddyfile.Helper) (caddyhttp.MiddlewareHandler, error) {
	var m Middleware
	err := m.UnmarshalCaddyfile(h.Dispenser)
	return &m, err
}

func (e *Endpoint) UnmarshalCaddyfile(d *caddyfile.Dispenser) error {
	d.Next() // consume the directive

	return nil
}

func ParseCaddyFileEndpoint(h httpcaddyfile.Helper) (caddyhttp.MiddlewareHandler, error) {
	var e Endpoint
	err := e.UnmarshalCaddyfile(h.Dispenser)
	return &e, err
}
