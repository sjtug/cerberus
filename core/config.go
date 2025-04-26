package core

import (
	"errors"
	"fmt"
	"time"

	"github.com/sjtug/cerberus/internal/ipblock"
)

const (
	DefaultCookieName        = "cerberus-auth"
	DefaultHeaderName        = "X-Cerberus-Status"
	DefaultDifficulty        = 4
	DefaultMaxPending        = 128
	DefaultAccessPerApproval = 8
	DefaultBlockTTL          = time.Hour * 24 // 1 day
	DefaultPendingTTL        = time.Hour      // 1 hour
	DefaultApprovalTTL       = time.Hour      // 1 hour
	DefaultMaxMemUsage       = 1 << 29        // 512MB
	DefaultTitle             = "Cerberus Challenge"
	DefaultDescription       = "Making sure you're not a bot!"
	DefaultIPV4Prefix        = 32
	DefaultIPV6Prefix        = 64
)

type Config struct {
	// Challenge difficulty (number of leading zeroes in the hash).
	Difficulty int `json:"difficulty,omitempty"`
	// When set to true, the handler will drop the connection instead of returning a 403 if the IP is blocked.
	Drop bool `json:"drop,omitempty"`
	// MaxPending is the maximum number of pending (and failed) requests.
	// Any IP block (prefix configured in prefix_cfg) with more than this number of pending requests will be blocked.
	MaxPending int32 `json:"max_pending,omitempty"`
	// AccessPerApproval is the number of requests allowed per successful challenge.
	AccessPerApproval int32 `json:"access_per_approval,omitempty"`
	// BlockTTL is the time to live for blocked IPs.
	BlockTTL time.Duration `json:"block_ttl,omitempty"`
	// PendingTTL is the time to live for pending requests when considering whether to block an IP.
	PendingTTL time.Duration `json:"pending_ttl,omitempty"`
	// ApprovalTTL is the time to live for approved requests.
	ApprovalTTL time.Duration `json:"approval_ttl,omitempty"`
	// MaxMemUsage is the maximum memory usage for the pending and blocklist caches.
	MaxMemUsage int64 `json:"max_mem_usage,omitempty"`
	// CookieName is the name of the cookie used to store signed certificate.
	CookieName string `json:"cookie_name,omitempty"`
	// HeaderName is the name of the header used to store cerberus status ("PASS-BRIEF", "PASS-FULL", "BLOCK", "FAIL").
	HeaderName string `json:"header_name,omitempty"`
	// Title is the title of the challenge page.
	Title string `json:"title,omitempty"`
	// Mail is the email address to contact for support.
	Mail string `json:"mail,omitempty"`
	// PrefixCfg is to configure prefixes used to block users in these IP prefix blocks, e.g., /24 /64.
	PrefixCfg ipblock.Config `json:"prefix_cfg,omitempty"`
}

func (c *Config) Provision() {
	if c.Difficulty == 0 {
		c.Difficulty = DefaultDifficulty
	}
	if c.MaxPending == 0 {
		c.MaxPending = DefaultMaxPending
	}
	if c.AccessPerApproval == 0 {
		c.AccessPerApproval = DefaultAccessPerApproval
	}
	if c.BlockTTL == time.Duration(0) {
		c.BlockTTL = DefaultBlockTTL
	}
	if c.PendingTTL == time.Duration(0) {
		c.PendingTTL = DefaultPendingTTL
	}
	if c.ApprovalTTL == time.Duration(0) {
		c.ApprovalTTL = DefaultApprovalTTL
	}
	if c.MaxMemUsage == 0 {
		c.MaxMemUsage = DefaultMaxMemUsage
	}
	if c.CookieName == "" {
		c.CookieName = DefaultCookieName
	}
	if c.HeaderName == "" {
		c.HeaderName = DefaultHeaderName
	}
	if c.Title == "" {
		c.Title = DefaultTitle
	}
	if c.PrefixCfg.IsEmpty() {
		c.PrefixCfg = ipblock.Config{
			V4Prefix: DefaultIPV4Prefix,
			V6Prefix: DefaultIPV6Prefix,
		}
	}
}

func (c *Config) Validate() error {
	if c.Difficulty < 1 {
		return errors.New("difficulty must be at least 1")
	}
	if c.MaxPending < 1 {
		return errors.New("max_pending must be at least 1")
	}
	if c.AccessPerApproval < 1 {
		return errors.New("access_per_approval must be at least 1")
	}
	if c.BlockTTL < 0 {
		return errors.New("block_ttl must be a positive duration")
	}
	if c.PendingTTL < 0 {
		return errors.New("pending_ttl must be a positive duration")
	}
	if c.ApprovalTTL < 0 {
		return errors.New("approval_ttl must be a positive duration")
	}
	if c.MaxMemUsage < 1 {
		return errors.New("max_mem_usage must be at least 1")
	}
	if err := ipblock.ValidateConfig(c.PrefixCfg); err != nil {
		return fmt.Errorf("prefix_cfg: %w", err)
	}

	return nil
}

func (c *Config) StateCompatible(other *Config) bool {
	return c.BlockTTL == other.BlockTTL &&
		c.PendingTTL == other.PendingTTL &&
		c.MaxMemUsage == other.MaxMemUsage &&
		c.PrefixCfg == other.PrefixCfg
}
