package ipblock

import (
	"errors"
	"fmt"
	"net"
)

// IPBlock represents either an IPv4 or IPv6 block
// Data representation:
// v6: Stored as first 8 bytes of the address
// v4: Stored as 2001:db8:<v4>
type IPBlock struct {
	data uint64
}

// IPBlockConfig represents the configuration for an IPBlock.
// It's used to specify the prefix length for IPv4 and IPv6 blocks for IP blocking.
type Config struct {
	// V4Prefix is the prefix length for IPv4 blocks
	V4Prefix int `json:"v4_prefix"`
	// V6Prefix is the prefix length for IPv6 blocks
	V6Prefix int `json:"v6_prefix"`
}

func (c Config) IsEmpty() bool {
	return c.V4Prefix == 0 && c.V6Prefix == 0
}

func ValidateConfig(cfg Config) error {
	if cfg.V4Prefix > 32 || cfg.V4Prefix < 1 {
		return fmt.Errorf("v4_prefix must be between 1 and 32, got %d", cfg.V4Prefix)
	} else if cfg.V6Prefix > 64 || cfg.V6Prefix < 1 {
		// Due to uint64 size limitation, we only allow at most /64 for IPv6
		return fmt.Errorf("v6_prefix must be between 1 and 64, got %d", cfg.V6Prefix)
	}
	return nil
}

// NewIPBlock creates a new IPBlock from an IP address
func NewIPBlock(ip net.IP, cfg Config) (IPBlock, error) {
	if ip == nil {
		return IPBlock{}, errors.New("invalid IP: nil")
	}

	ip4 := ip.To4()
	if ip4 != nil {
		ip4 = ip4.Mask(net.CIDRMask(cfg.V4Prefix, 32))
		return IPBlock{
			data: 0x20010db800000000 | uint64(ip4[0])<<24 | uint64(ip4[1])<<16 | uint64(ip4[2])<<8 | uint64(ip4[3]),
		}, nil
	}

	ip6 := ip.To16()
	if ip6 == nil {
		return IPBlock{}, fmt.Errorf("invalid IP: %v", ip)
	}
	ip6 = ip6.Mask(net.CIDRMask(cfg.V6Prefix, 128))
	data := uint64(0)
	for i := range 8 {
		data = data<<8 | uint64(ip6[i])
	}
	return IPBlock{data: data}, nil
}

func (b IPBlock) ToUint64() uint64 {
	return b.data
}

func (b IPBlock) ToIPNet(cfg Config) *net.IPNet {
	if b.data&0xffffffff00000000 == 0x20010db800000000 {
		return &net.IPNet{
			IP:   net.IPv4(byte(b.data>>24&0xff), byte(b.data>>16&0xff), byte(b.data>>8&0xff), byte(b.data&0xff)),
			Mask: net.CIDRMask(cfg.V4Prefix, 32),
		}
	}

	ip := make(net.IP, 16)
	for i := range 8 {
		ip[7-i] = byte(b.data >> (8 * i))
	}
	return &net.IPNet{
		IP:   ip,
		Mask: net.CIDRMask(cfg.V6Prefix, 128),
	}
}
