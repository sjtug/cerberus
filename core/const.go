package core

import "time"

const (
	AppName    = "cerberus"
	VarIPBlock = "cerberus-block"
	VarReqID   = "cerberus-request-id"
	Version    = "v0.4.3"
	NonceTTL   = 2 * time.Minute
)
