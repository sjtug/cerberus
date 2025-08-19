package web

import (
	_ "embed"
	"encoding/json"
)

//go:embed dist/.vite/manifest.json
var manifestContent []byte

type Asset struct {
	File string `json:"file"`
}

type Manifest map[string]Asset

func LoadManifest() (Manifest, error) {
	var manifest Manifest
	err := json.Unmarshal(manifestContent, &manifest)
	if err != nil {
		return nil, err
	}

	return manifest, nil
}
