package core

import (
	"sync/atomic"
	"time"
	"unsafe"

	"crypto/sha256"
	"encoding/hex"

	"github.com/elastic/go-freelru"
	"github.com/sjtug/cerberus/internal/ipblock"
	"golang.org/x/crypto/ed25519"
)

const (
	FreeLRUInternalCost = 20
	PendingItemCost     = 4 + int64(unsafe.Sizeof(&atomic.Int32{})) + FreeLRUInternalCost
	BlocklistItemCost   = FreeLRUInternalCost + int64(unsafe.Sizeof(ipblock.IPBlock{}))
)

// hashIPBlock computes a hash value for an IPBlock to be used in sharded LRU cache.
// It uses the internal uint64 data and mixes it for better distribution.
func hashIPBlock(ip ipblock.IPBlock) uint32 {
	data := ip.ToUint64()
	// Mix the bits using multiplication by a prime and XOR
	hash := uint32(data) ^ uint32(data>>32) // #nosec G115 we explicitly want to truncate the uint64 to uint32
	hash = hash * 0x9e3779b1                // Golden ratio
	return hash
}

type InstanceState struct {
	pub       ed25519.PublicKey
	priv      ed25519.PrivateKey
	fp        string
	pending   freelru.Cache[ipblock.IPBlock, *atomic.Int32]
	blocklist freelru.Cache[ipblock.IPBlock, struct{}]
	stop      chan struct{}
}

func NewInstanceState(pendingMaxMemUsage int64, blocklistMaxMemUsage int64, pendingTTL time.Duration, blocklistTTL time.Duration) (*InstanceState, int64, int64, error) {
	stop := make(chan struct{})

	pendingElems := pendingMaxMemUsage / BlocklistItemCost
	pending, err := freelru.NewSharded[ipblock.IPBlock, *atomic.Int32](uint32(pendingElems), hashIPBlock) // #nosec G115 we trust config input
	if err != nil {
		return nil, 0, 0, err
	}
	pending.SetLifetime(pendingTTL)

	go func() {
		for {
			select {
			case <-stop:
				return
			case <-time.After(37 * time.Second):
				pending.PurgeExpired()
			}
		}
	}()

	blocklistElems := blocklistMaxMemUsage / BlocklistItemCost
	blocklist, err := freelru.NewSharded[ipblock.IPBlock, struct{}](uint32(blocklistElems), hashIPBlock) // #nosec G115 we trust config input
	if err != nil {
		return nil, 0, 0, err
	}
	blocklist.SetLifetime(blocklistTTL)

	go func() {
		for {
			select {
			case <-stop:
				return
			case <-time.After(61 * time.Second):
				blocklist.PurgeExpired()
			}
		}
	}()

	pub, priv, err := ed25519.GenerateKey(nil)
	if err != nil {
		return nil, 0, 0, err
	}

	fp := sha256.Sum256(priv.Seed())

	return &InstanceState{
		pub:       pub,
		priv:      priv,
		fp:        hex.EncodeToString(fp[:]),
		pending:   pending,
		blocklist: blocklist,
		stop:      stop,
	}, pendingElems, blocklistElems, nil
}

func (s *InstanceState) GetPublicKey() ed25519.PublicKey {
	return s.pub
}

func (s *InstanceState) GetPrivateKey() ed25519.PrivateKey {
	return s.priv
}

func (s *InstanceState) GetFingerprint() string {
	return s.fp
}

func (s *InstanceState) IncPending(ip ipblock.IPBlock) int32 {
	counter, ok := s.pending.Get(ip)
	if ok {
		return counter.Add(1)
	}

	var newCounter atomic.Int32
	newCounter.Store(1)
	s.pending.Add(ip, &newCounter)
	return 1
}

func (s *InstanceState) DecPending(ip ipblock.IPBlock) int32 {
	counter, ok := s.pending.Get(ip)
	if ok {
		count := counter.Add(-1)
		if count <= 0 {
			s.pending.Remove(ip)
		}
		return count
	}

	return 0
}

func (s *InstanceState) RemovePending(ip ipblock.IPBlock) bool {
	return s.pending.Remove(ip)
}

func (s *InstanceState) InsertBlocklist(ip ipblock.IPBlock) {
	s.blocklist.Add(ip, struct{}{})
}

func (s *InstanceState) ContainsBlocklist(ip ipblock.IPBlock) bool {
	_, ok := s.blocklist.Get(ip)
	return ok
}

func (s *InstanceState) Close() {
	close(s.stop)
}
