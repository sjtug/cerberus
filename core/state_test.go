package core

import (
	"net"
	"testing"
	"time"

	"github.com/sjtug/cerberus/internal/ipblock"
)

func newTestState(t *testing.T) *InstanceState {
	state, _, _, _, err := NewInstanceState(
		1<<20,     // 1MB for pending
		1<<20,     // 1MB for blocklist
		1<<20,     // 1MB for approved
		time.Hour, // 1 hour TTL for pending
		time.Hour, // 1 hour TTL for blocklist
		time.Hour, // 1 hour TTL for approved
	)
	if err != nil {
		t.Fatalf("failed to create instance state: %v", err)
	}
	return state
}

func newTestIPBlock(t *testing.T, ipStr string) ipblock.IPBlock {
	ip := net.ParseIP(ipStr)
	ipBlock, err := ipblock.NewIPBlock(ip, ipblock.Config{V4Prefix: 24, V6Prefix: 64})
	if err != nil {
		t.Fatalf("failed to create IP block: %v", err)
	}
	return ipBlock
}

func TestPending(t *testing.T) {
	state := newTestState(t)
	defer state.Close()
	ipBlock := newTestIPBlock(t, "192.168.1.1")

	tests := []struct {
		name     string
		action   func() int32
		expected int32
	}{
		{
			name: "initial increment",
			action: func() int32 {
				return state.IncPending(ipBlock)
			},
			expected: 1,
		},
		{
			name: "second increment",
			action: func() int32 {
				return state.IncPending(ipBlock)
			},
			expected: 2,
		},
		{
			name: "decrement",
			action: func() int32 {
				return state.DecPending(ipBlock)
			},
			expected: 1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.action(); got != tt.expected {
				t.Errorf("expected count to be %d, got %d", tt.expected, got)
			}
		})
	}

	// Test removing pending
	t.Run("remove pending", func(t *testing.T) {
		if !state.RemovePending(ipBlock) {
			t.Error("expected pending to be removed")
		}
	})

	// Test that pending is actually removed
	t.Run("verify removal", func(t *testing.T) {
		if count := state.IncPending(ipBlock); count != 1 {
			t.Errorf("expected count to be 1 after removal, got %d", count)
		}
	})
}

func TestPendingSubnets(t *testing.T) {
	state := newTestState(t)
	defer state.Close()

	// Create IP blocks in different subnets
	ipBlock1 := newTestIPBlock(t, "192.168.1.1")
	ipBlock2 := newTestIPBlock(t, "192.169.1.1")

	tests := []struct {
		name     string
		ipBlock  ipblock.IPBlock
		action   func() int32
		expected int32
	}{
		{
			name:    "first subnet initial increment",
			ipBlock: ipBlock1,
			action: func() int32 {
				return state.IncPending(ipBlock1)
			},
			expected: 1,
		},
		{
			name:    "second subnet initial increment",
			ipBlock: ipBlock2,
			action: func() int32 {
				return state.IncPending(ipBlock2)
			},
			expected: 1,
		},
		{
			name:    "first subnet second increment",
			ipBlock: ipBlock1,
			action: func() int32 {
				return state.IncPending(ipBlock1)
			},
			expected: 2,
		},
		{
			name:    "second subnet second increment",
			ipBlock: ipBlock2,
			action: func() int32 {
				return state.IncPending(ipBlock2)
			},
			expected: 2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.action(); got != tt.expected {
				t.Errorf("expected count for %s to be %d, got %d", tt.ipBlock.ToIPNet(ipblock.Config{V4Prefix: 24, V6Prefix: 64}).String(), tt.expected, got)
			}
		})
	}
}

func TestBlocklist(t *testing.T) {
	state := newTestState(t)
	defer state.Close()

	ipBlock := newTestIPBlock(t, "192.168.1.1")
	ipBlock2 := newTestIPBlock(t, "192.168.1.2") // Same block
	ipBlock3 := newTestIPBlock(t, "192.169.1.1") // Different block

	tests := []struct {
		name     string
		ipBlock  ipblock.IPBlock
		expected bool
	}{
		{
			name:     "initial state",
			ipBlock:  ipBlock,
			expected: false,
		},
		{
			name:     "same block after insertion",
			ipBlock:  ipBlock2,
			expected: true,
		},
		{
			name:     "different block",
			ipBlock:  ipBlock3,
			expected: false,
		},
	}

	// Test initial state
	t.Run(tests[0].name, func(t *testing.T) {
		if state.ContainsBlocklist(tests[0].ipBlock) {
			t.Error("expected IP to not be in blocklist initially")
		}
	})

	// Insert into blocklist
	state.InsertBlocklist(ipBlock)

	// Test remaining cases
	for _, tt := range tests[1:] {
		t.Run(tt.name, func(t *testing.T) {
			if got := state.ContainsBlocklist(tt.ipBlock); got != tt.expected {
				t.Errorf("expected blocklist status to be %v, got %v", tt.expected, got)
			}
		})
	}
}
