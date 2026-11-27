package directives

import (
	"testing"

	"github.com/caddyserver/caddy/v2/caddyconfig/caddyfile"
)

func TestUnmarshalCaddyfileAssetURL(t *testing.T) {
	input := `cerberus {
		asset_url https://cdn.example.com/cerberus
		difficulty 5
	}`
	d := caddyfile.NewTestDispenser(input)
	var app App
	if err := app.UnmarshalCaddyfile(d); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if app.AssetURL != "https://cdn.example.com/cerberus" {
		t.Errorf("asset_url = %q, want %q", app.AssetURL, "https://cdn.example.com/cerberus")
	}
	if app.Difficulty != 5 {
		t.Errorf("difficulty = %d, want 5", app.Difficulty)
	}
}
