package ipblock

import (
	"net"
	"slices"
	"testing"

	"pgregory.net/rapid"
)

func TestIpBlock_spec(t *testing.T) {
	v4Gen := rapid.Custom(func(t *rapid.T) net.IP {
		return net.IPv4(
			rapid.Uint8().Draw(t, "v4_a"),
			rapid.Uint8().Draw(t, "v4_b"),
			rapid.Uint8().Draw(t, "v4_c"),
			rapid.Uint8().Draw(t, "v4_d"),
		)
	})
	v6Gen := rapid.Custom(func(t *rapid.T) net.IP {
		return net.IP(rapid.SliceOfN(rapid.Byte(), 16, 16).Draw(t, "v6"))
	}).Filter(func(ip net.IP) bool {
		// Make sure it's not of 2001:db8::/32
		return ip[0] != 0x20 || ip[1] != 0x01 || ip[2] != 0x0d || ip[3] != 0xb8
	})
	IPGen := rapid.Custom(func(t *rapid.T) net.IP {
		selV4 := rapid.Bool().Draw(t, "selV4")
		if selV4 {
			return v4Gen.Draw(t, "v4")
		}
		return v6Gen.Draw(t, "v6")
	}).Filter(func(ip net.IP) bool {
		return !ip.IsUnspecified()
	})
	cfgGen := rapid.Custom(func(t *rapid.T) Config {
		return Config{
			V4Prefix: rapid.IntRange(1, 32).Draw(t, "v4_prefix"),
			V6Prefix: rapid.IntRange(1, 64).Draw(t, "v6_prefix"),
		}
	})
	rapid.Check(t, func(t *rapid.T) {
		ip := IPGen.Draw(t, "ip")
		cfg := cfgGen.Draw(t, "cfg")
		var expected net.IPNet
		if ip.To4() != nil {
			expected = net.IPNet{
				IP:   ip.Mask(net.CIDRMask(cfg.V4Prefix, 32)),
				Mask: net.CIDRMask(cfg.V4Prefix, 32),
			}
		} else {
			expected = net.IPNet{
				IP:   ip.Mask(net.CIDRMask(cfg.V6Prefix, 128)),
				Mask: net.CIDRMask(cfg.V6Prefix, 128),
			}
		}

		block, err := NewIPBlock(ip, cfg)
		if err != nil {
			t.Fatalf("failed to create IPBlock: %v", err)
		}

		actual := block.ToIPNet(cfg)
		if !actual.IP.Equal(expected.IP) || !slices.Equal(actual.Mask, expected.Mask) {
			t.Fatalf("expected %s, got %s", expected.String(), actual.String())
		}
	})
}
