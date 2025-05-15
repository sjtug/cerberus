package core

import (
	"bytes"
	"crypto/ed25519"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/sjtug/cerberus/internal/ipblock"
	"go.uber.org/zap"
	"golang.org/x/crypto/ssh"
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
	// Ed25519 signing key file path. If not provided, a new key will be generated.
	Ed25519KeyFile string `json:"ed25519_key_file,omitempty"`
	// Ed25519 signing key content. If not provided, a new key will be generated.
	Ed25519Key string `json:"ed25519_key,omitempty"`
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

	ed25519Key ed25519.PrivateKey
	ed25519Pub ed25519.PublicKey
}

func (c *Config) Provision(logger *zap.Logger) error {
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

	if c.Ed25519KeyFile != "" || c.Ed25519Key != "" {
		var raw []byte
		var err error
		if c.Ed25519KeyFile != "" {
			logger.Info("loading ed25519 key from file", zap.String("path", c.Ed25519KeyFile))

			raw, err = os.ReadFile(c.Ed25519KeyFile)
			if err != nil {
				return fmt.Errorf("failed to read ed25519 key file: %w", err)
			}
		} else {
			raw = []byte(c.Ed25519Key)
		}

		c.ed25519Key, err = LoadEd25519Key(raw)
		if err != nil {
			return fmt.Errorf("failed to load ed25519 key: %w", err)
		}

		c.ed25519Pub = c.ed25519Key.Public().(ed25519.PublicKey)
	} else {
		logger.Info("generating new ed25519 key")
		var err error
		c.ed25519Pub, c.ed25519Key, err = ed25519.GenerateKey(nil)
		if err != nil {
			return fmt.Errorf("failed to generate ed25519 key: %w", err)
		}
	}

	return nil
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
	if c.Ed25519KeyFile != "" && c.Ed25519Key != "" {
		return errors.New("ed25519_key_file and ed25519_key cannot both be set")
	}
	if err := ipblock.ValidateConfig(c.PrefixCfg); err != nil {
		return fmt.Errorf("prefix_cfg: %w", err)
	}

	return nil
}

func (c *Config) StateCompatible(other *Config) bool {
	return c.BlockTTL == other.BlockTTL &&
		c.PendingTTL == other.PendingTTL &&
		c.ApprovalTTL == other.ApprovalTTL &&
		c.AccessPerApproval == other.AccessPerApproval &&
		c.MaxMemUsage == other.MaxMemUsage &&
		c.PrefixCfg == other.PrefixCfg
}

func (c *Config) GetPublicKey() ed25519.PublicKey {
	return c.ed25519Pub
}

func (c *Config) GetPrivateKey() ed25519.PrivateKey {
	return c.ed25519Key
}

func LoadEd25519Key(data []byte) (ed25519.PrivateKey, error) {
	// First try to parse as openssh or x509 private key
	if bytes.HasPrefix(data, []byte("-----BEGIN ")) {
		raw, err := ssh.ParseRawPrivateKey(data)
		if err != nil {
			return nil, fmt.Errorf("failed to parse pem private key: %w", err)
		}
		if key, ok := raw.(ed25519.PrivateKey); ok {
			return key, nil
		}
		if key, ok := raw.(*ed25519.PrivateKey); ok {
			return *key, nil
		}
		return nil, errors.New("must be ed25519 private key")
	}

	// Then try to parse as hex
	raw, err := hex.DecodeString(string(data))
	if err != nil {
		return nil, fmt.Errorf("failed to parse hex private key: %w", err)
	}
	if len(raw) != ed25519.SeedSize {
		return nil, fmt.Errorf("invalid ed25519 private key: expected %d bytes, got %d", ed25519.SeedSize, len(raw))
	}

	key := ed25519.NewKeyFromSeed(raw)
	return key, nil
}
