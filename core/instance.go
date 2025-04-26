package core

import (
	"go.uber.org/zap"
)

// Instance is the shared core of the cerberus module.
// There's only one instance of this struct in the entire Caddy runtime.
type Instance struct {
	*InstanceState
	Config
}

// UpdateWithConfig updates the instance with a new config.
// If the config is incompatible with the current config, its internal state will be reset.
// User can pass in an optional logger to log basic metrics about the initialized state.
func (i *Instance) UpdateWithConfig(c Config, logger *zap.Logger) error {
	logger.Info("updating cerberus instance config")
	if i.Config.StateCompatible(&c) {
		// We only need to update the config.
		i.Config = c
	} else {
		// We need to reset the state.
		logger.Info("existing cerberus instance with incompatible config found, resetting state")
		state, pendingElems, blocklistElems, approvalElems, err := NewInstanceState(c.MaxMemUsage, c.MaxMemUsage, c.MaxMemUsage, c.PendingTTL, c.BlockTTL, c.ApprovalTTL)
		if err != nil {
			return err
		}
		i.Config = c
		i.InstanceState.Close() // Close the old state
		i.InstanceState = state
		logger.Info("cerberus state initialized",
			zap.Int64("pending_elems", pendingElems),
			zap.Int64("blocklist_elems", blocklistElems),
			zap.Int64("approval_elems", approvalElems),
		)
	}
	return nil
}
