package core

import (
	"sync/atomic"
	"time"
	"unsafe"

	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"

	"github.com/elastic/go-freelru"
	"github.com/google/uuid"
	"github.com/sjtug/cerberus/internal/expiremap"
	"github.com/sjtug/cerberus/internal/ipblock"
	"github.com/zeebo/xxh3"
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
	binary.BigEndian.PutUint64(buf[:], data)

	hash := xxh3.Hash(buf[:])
	return uint32(hash) // #nosec G115 -- expected truncation
}

func hashUUID(id uuid.UUID) uint32 {
	hash := xxh3.Hash(id[:])
	return uint32(hash) // #nosec G115 -- expected truncation
}

type InstanceState struct {
	fp        string
	pending   freelru.Cache[ipblock.IPBlock, *atomic.Int32]
	blocklist freelru.Cache[ipblock.IPBlock, struct{}]
	approval  freelru.Cache[uuid.UUID, *atomic.Int32]
	usedNonce *expiremap.ExpireMap[uint32, struct{}]
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

// initUsedNonce creates and initializes an ExpireMap for tracking used nonces
func initUsedNonce(stop chan struct{}, purgeInterval time.Duration) *expiremap.ExpireMap[uint32, struct{}] {
	usedNonce := expiremap.NewExpireMap[uint32, struct{}](func(x uint32) uint32 {
		return x
	})
	go func() {
		for {
			select {
			case <-stop:
				return
			case <-time.After(purgeInterval):
				usedNonce.PurgeExpired()
			}
		}
	}()
	return usedNonce
}

func NewInstanceState(config Config) (*InstanceState, int64, int64, int64, error) {
	uuid.EnableRandPool()

	stop := make(chan struct{})

	pendingMaxMemUsage := config.MaxMemUsage / 10
	blocklistMaxMemUsage := config.MaxMemUsage / 10
	approvalMaxMemUsage := config.MaxMemUsage * 4 / 5

	pendingElems := uint32(pendingMaxMemUsage / PendingItemCost) // #nosec G115 we trust config input
	pending, err := initLRU[ipblock.IPBlock, *atomic.Int32](
		pendingElems,
		hashIPBlock,
		config.PendingTTL,
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
		config.BlockTTL,
		stop,
		61*time.Second,
	)
	if err != nil {
		return nil, 0, 0, 0, err
	}

	approvalElems := uint32(approvalMaxMemUsage / ApprovalItemCost) // #nosec G115 we trust config input
	approval, err := initLRU[uuid.UUID, *atomic.Int32](
		approvalElems,
		hashUUID,
		config.ApprovalTTL,
		stop,
		43*time.Second,
	)
	if err != nil {
		return nil, 0, 0, 0, err
	}

	usedNonce := initUsedNonce(stop, 41*time.Second)

	fp := sha256.Sum256(config.ed25519Key.Seed())

	return &InstanceState{
		fp:        hex.EncodeToString(fp[:]),
		pending:   pending,
		blocklist: blocklist,
		approval:  approval,
		usedNonce: usedNonce,
		stop:      stop,
	}, int64(pendingElems), int64(blocklistElems), int64(approvalElems), nil
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

// InsertUsedNonce inserts a nonce into the usedNonce map.
// Returns true if the nonce was inserted, false if it was already present.
func (s *InstanceState) InsertUsedNonce(nonce uint32) bool {
	return s.usedNonce.SetIfAbsent(nonce, struct{}{}, NonceTTL)
}

func (s *InstanceState) Close() {
	close(s.stop)
}
