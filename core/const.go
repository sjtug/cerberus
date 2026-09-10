package core

import "time"

const (
	AppName    = "cerberus"
	VarIPBlock = "cerberus-block"
	VarReqID   = "cerberus-request-id"
	Version    = "v0.4.9"
	NonceTTL   = 2 * time.Minute
)
