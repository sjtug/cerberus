package randpool

import (
	"crypto/rand"
	"encoding/binary"
	"io"
	"sync"
)

const (
	poolSize = 16 * 16
)

var (
	poolMu  sync.Mutex
	pool    [poolSize]byte
	poolPos = poolSize
)

func ReadUint32() uint32 {
	poolMu.Lock()
	defer poolMu.Unlock()

	if poolPos == poolSize {
		_, err := io.ReadFull(rand.Reader, pool[:])
		if err != nil {
			panic(err)
		}
		poolPos = 0
	}

	poolPos += 4

	return binary.BigEndian.Uint32(pool[poolPos-4 : poolPos])
}
