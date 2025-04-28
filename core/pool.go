package core

import (
	"sync"

	"go.uber.org/zap"
)

var (
	lock     sync.RWMutex
	instance *Instance
)

// GetInstance returns an instance of given config.
// If there already exists an instance (during server reload), it will be updated with the new config.
// Otherwise, a new instance will be created.
// User can pass in an optional logger to log basic metrics about the initialized state.
func GetInstance(config Config, logger *zap.Logger) (*Instance, error) {
	lock.Lock()
	defer lock.Unlock()

	if instance == nil {
		// Initialize a new instance.
		state, pendingElems, blocklistElems, approvalElems, err := NewInstanceState(config.MaxMemUsage, config.MaxMemUsage, config.MaxMemUsage, config.PendingTTL, config.BlockTTL, config.ApprovalTTL)
		if err != nil {
			return nil, err
		}

		logger.Info("cerberus state initialized",
			zap.Int64("pending_elems", pendingElems),
			zap.Int64("blocklist_elems", blocklistElems),
			zap.Int64("approval_elems", approvalElems),
		)
		instance = &Instance{
			Config:        config,
			InstanceState: state,
		}
		return instance, nil
	}

	// Update the existing instance with the new config.
	err := instance.UpdateWithConfig(config, logger)
	if err != nil {
		return nil, err
	}

	return instance, nil
}
