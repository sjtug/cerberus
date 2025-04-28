package expiremap

import (
	"runtime"
	"sync"
	"time"
)

var (
	numShards = runtime.GOMAXPROCS(0) * 16
)

type entry[V any] struct {
	value  V
	expire time.Time
}

type shard[K comparable, V any] struct {
	mu    sync.Mutex
	store map[K]entry[V]
}

type ExpireMap[K comparable, V any] struct {
	shards []*shard[K, V]
	hash   func(K) uint32
}

// fastModulo calculates x % n without using the modulo operator (~4x faster).
// Reference: https://lemire.me/blog/2016/06/27/a-fast-alternative-to-the-modulo-reduction/
func fastModulo(x, n uint32) uint32 {
	return uint32((uint64(x) * uint64(n)) >> 32) //nolint:gosec
}

func NewExpireMap[K comparable, V any](hash func(K) uint32) *ExpireMap[K, V] {
	shards := make([]*shard[K, V], numShards)
	for i := range shards {
		shards[i] = &shard[K, V]{store: make(map[K]entry[V])}
	}
	return &ExpireMap[K, V]{shards: shards, hash: hash}
}

func (m *ExpireMap[K, V]) Get(key K) (*V, bool) {
	shard := m.shards[fastModulo(m.hash(key), uint32(len(m.shards)))] // #nosec G115 we don't have so many cores

	shard.mu.Lock()
	defer shard.mu.Unlock()

	value, ok := shard.store[key]
	if !ok {
		// Key not found
		return nil, false
	}

	if value.expire.Before(time.Now()) {
		// Key expired, remove it
		delete(shard.store, key)
		return nil, false
	}

	return &value.value, true
}

// SetIfAbsent sets the value for the key if it is not already present.
// Returns true if the value was set, false if it was already present.
func (m *ExpireMap[K, V]) SetIfAbsent(key K, value V, ttl time.Duration) bool {
	shard := m.shards[fastModulo(m.hash(key), uint32(len(m.shards)))] // #nosec G115 we don't have so many cores

	shard.mu.Lock()
	defer shard.mu.Unlock()

	if _, ok := shard.store[key]; ok {
		return false
	}

	shard.store[key] = entry[V]{value: value, expire: time.Now().Add(ttl)}
	return true
}

func (m *ExpireMap[K, V]) PurgeExpired() {
	now := time.Now()

	for _, shard := range m.shards {
		shard.mu.Lock()
		defer shard.mu.Unlock()

		for key, entry := range shard.store {
			if entry.expire.Before(now) {
				delete(shard.store, key)
			}
		}
	}
}
