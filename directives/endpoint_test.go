package directives

import (
	"testing"
)

func TestNormalizeRedirect(t *testing.T) {
	tests := []struct {
		name    string
		redir   string
		want    string
		wantErr bool
	}{
		{
			name:    "absolute URL",
			redir:   "https://example.com/protected/path?x=1#section",
			wantErr: true,
		},
		{
			name:  "relative URL",
			redir: "/protected/path?x=1#section",
			want:  "/protected/path?x=1#section",
		},
		{
			name:    "external absolute URL",
			redir:   "https://attacker.example/phish",
			wantErr: true,
		},
		{
			name:    "protocol-relative URL",
			redir:   "//attacker.example/phish",
			wantErr: true,
		},
		{
			name:    "triple slash URL",
			redir:   "///attacker.example/phish",
			wantErr: true,
		},
		{
			name:    "encoded protocol-relative URL",
			redir:   "/%2f%2fattacker.example/phish",
			wantErr: true,
		},
		{
			name:    "backslash-like URL is normalized and rejected",
			redir:   `/\attacker.example/phish`,
			wantErr: true,
		},
		{
			name:    "encoded backslash-like URL is normalized and rejected",
			redir:   `/%5c%5cattacker.example/phish`,
			wantErr: true,
		},
		{
			name:  "backslash in safe path is normalized",
			redir: `/safe\path?x=1#section`,
			want:  "/safe/path?x=1#section",
		},
		{
			name:    "non-http scheme",
			redir:   "javascript:alert(1)",
			wantErr: true,
		},
		{
			name:    "path-relative URL",
			redir:   "next",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := normalizeRedirect(tt.redir)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("normalizeRedirect(%q) returned nil error", tt.redir)
				}
				return
			}
			if err != nil {
				t.Fatalf("normalizeRedirect(%q) returned error: %v", tt.redir, err)
			}
			if got != tt.want {
				t.Fatalf("normalizeRedirect(%q) = %q, want %q", tt.redir, got, tt.want)
			}
		})
	}
}
