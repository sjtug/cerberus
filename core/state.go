package core

import (
	"sync/atomic"
	"time"
	"unsafe"

	"crypto/sha256"
	"encoding/hex"

	"github.com/elastic/go-freelru"
	"github.com/google/uuid"
	"github.com/sjtug/cerberus/internal/ipblock"
	"github.com/zeebo/xxh3"
	"golang.org/x/crypto/ed25519"
)

const (
	FreeLRUInternalCost = 20
	PendingItemCost     = FreeLRUInternalCost + int64(unsafe.Sizeof(ipblock.IPBlock{})) + int64(unsafe.Sizeof(&atomic.Int32{})) + int64(unsafe.Sizeof(atomic.Int32{}))
	BlocklistItemCost   = FreeLRUInternalCost + int64(unsafe.Sizeof(ipblock.IPBlock{}))
	ApprovalItemCost    = FreeLRUInternalCost + int64(unsafe.Sizeof(uuid.UUID{})) + int64(unsafe.Sizeof(&atomic.Int32{})) + int64(unsafe.Sizeof(atomic.Int32{}))
)

func hashIPBlock(ip ipblock.IPBlock) uint32 {
	data := ip.ToUint64()

	var buf [8]byte
	buf[0] = byte(data >> 56)
	buf[1] = byte(data >> 48)
	buf[2] = byte(data >> 40)
	buf[3] = byte(data >> 32)
	buf[4] = byte(data >> 24)
	buf[5] = byte(data >> 16)
	buf[6] = byte(data >> 8)
	buf[7] = byte(data)

	hash := xxh3.Hash(buf[:])
	return uint32(hash) // #nosec G115 -- expected truncation
}

func hashUUID(id uuid.UUID) uint32 {
	hash := xxh3.Hash(id[:])
	return uint32(hash) // #nosec G115 -- expected truncation
}

type InstanceState struct {
	pub       ed25519.PublicKey
	priv      ed25519.PrivateKey
	fp        string
	pending   freelru.Cache[ipblock.IPBlock, *atomic.Int32]
	blocklist freelru.Cache[ipblock.IPBlock, struct{}]
	approval  freelru.Cache[uuid.UUID, *atomic.Int32]
	stop      chan struct{}
}

// initLRU creates and initializes an LRU cache with the given parameters
func initLRU[K comparable, V any](
	elems uint32,
	hashFunc func(K) uint32,
	ttl time.Duration,
	stop chan struct{},
	purgeInterval time.Duration,
) (freelru.Cache[K, V], error) {
	cache, err := freelru.NewSharded[K, V](elems, hashFunc)
	if err != nil {
		return nil, err
	}
	cache.SetLifetime(ttl)

	go func() {
		for {
			select {
			case <-stop:
				return
			case <-time.After(purgeInterval):
				cache.PurgeExpired()
			}
		}
	}()

	return cache, nil
}

func NewInstanceState(pendingMaxMemUsage int64, blocklistMaxMemUsage int64, approvedMaxMemUsage int64, pendingTTL time.Duration, blocklistTTL time.Duration, approvalTTL time.Duration) (*InstanceState, int64, int64, int64, error) {
	uuid.EnableRandPool()

	stop := make(chan struct{})

	pendingElems := uint32(pendingMaxMemUsage / PendingItemCost) // #nosec G115 we trust config input
	pending, err := initLRU[ipblock.IPBlock, *atomic.Int32](
		pendingElems,
		hashIPBlock,
		pendingTTL,
		stop,
		37*time.Second,
	)
	if err != nil {
		return nil, 0, 0, 0, err
	}

	blocklistElems := uint32(blocklistMaxMemUsage / BlocklistItemCost) // #nosec G115 we trust config input
	blocklist, err := initLRU[ipblock.IPBlock, struct{}](
		blocklistElems,
		hashIPBlock,
		blocklistTTL,
		stop,
		61*time.Second,
	)
	if err != nil {
		return nil, 0, 0, 0, err
	}

	approvalElems := uint32(approvedMaxMemUsage / ApprovalItemCost) // #nosec G115 we trust config input
	approval, err := initLRU[uuid.UUID, *atomic.Int32](
		approvalElems,
		hashUUID,
		approvalTTL,
		stop,
		43*time.Second,
	)
	if err != nil {
		return nil, 0, 0, 0, err
	}

	pub, priv, err := ed25519.GenerateKey(nil)
	if err != nil {
		return nil, 0, 0, 0, err
	}

	fp := sha256.Sum256(priv.Seed())

	return &InstanceState{
		pub:       pub,
		priv:      priv,
		fp:        hex.EncodeToString(fp[:]),
		pending:   pending,
		blocklist: blocklist,
		approval:  approval,
		stop:      stop,
	}, int64(pendingElems), int64(blocklistElems), int64(approvalElems), nil
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
			return 0
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

// IssueApproval issues a new approval ID and returns it
func (s *InstanceState) IssueApproval(n int32) uuid.UUID {
	id := uuid.New()

	var counter atomic.Int32
	counter.Store(n)

	s.approval.Add(id, &counter)
	return id
}

// DecApproval decrements the counter of the approval ID and returns whether the ID is still valid
func (s *InstanceState) DecApproval(id uuid.UUID) bool {
	counter, ok := s.approval.Get(id)
	if ok {
		count := counter.Add(-1)
		if count < 0 {
			s.approval.Remove(id)
			return false
		}
		return true
	}
	return false
}

func (s *InstanceState) Close() {
	close(s.stop)
}
