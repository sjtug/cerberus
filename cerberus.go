package cerberus

import (
	"github.com/caddyserver/caddy/v2"
	"github.com/caddyserver/caddy/v2/caddyconfig/httpcaddyfile"
	"github.com/sjtug/cerberus/directives"
)

func init() {
	caddy.RegisterModule(directives.App{})
	caddy.RegisterModule(directives.Middleware{})
	caddy.RegisterModule(directives.Endpoint{})
	httpcaddyfile.RegisterGlobalOption("cerberus", directives.ParseCaddyFileApp)
	httpcaddyfile.RegisterHandlerDirective("cerberus", directives.ParseCaddyFileMiddleware)
	httpcaddyfile.RegisterHandlerDirective("cerberus_endpoint", directives.ParseCaddyFileEndpoint)
	httpcaddyfile.RegisterDirectiveOrder("cerberus", httpcaddyfile.Before, "invoke")
	httpcaddyfile.RegisterDirectiveOrder("cerberus_endpoint", httpcaddyfile.Before, "invoke")
}
