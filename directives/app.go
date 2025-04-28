package directives

import (
	"github.com/caddyserver/caddy/v2"
	"github.com/sjtug/cerberus/core"
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
	c.Config.Provision()

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
