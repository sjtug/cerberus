package core

import "time"

const (
	AppName    = "cerberus"
	VarIPBlock = "cerberus-block"
	VarReqID   = "cerberus-request-id"
	Version    = "v0.4.6"
	NonceTTL   = 2 * time.Minute
)
