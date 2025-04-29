package core

import (
	"testing"
)

func TestLoadEd25519Key(t *testing.T) {
	pkcs8Key := `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEILtvnJUD4PNgkbo5um6XyBEtILLW+G4hlDoDlRNge55z
-----END PRIVATE KEY-----`
	openSSHKey := `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtz
c2gtZWQyNTUxOQAAACAZgIQwnZMejmZI1lXlQDTtvT4HXlA5k0nsigfNe52B8gAA
AIgAAAAAAAAAAAAAAAtzc2gtZWQyNTUxOQAAACAZgIQwnZMejmZI1lXlQDTtvT4H
XlA5k0nsigfNe52B8gAAAEC7b5yVA+DzYJG6Obpul8gRLSCy1vhuIZQ6A5UTYHue
cxmAhDCdkx6OZkjWVeVANO29PgdeUDmTSeyKB817nYHyAAAAAAECAwQF
-----END OPENSSH PRIVATE KEY-----`
	hexKey := "bb6f9c9503e0f36091ba39ba6e97c8112d20b2d6f86e21943a039513607b9e73"

	t.Run("Parse OpenSSL/PKCS8/Raw format", func(t *testing.T) {
		fromPKCS8, err := LoadEd25519Key([]byte(pkcs8Key))
		if err != nil {
			t.Fatalf("failed to parse pkcs8 key: %v", err)
		}
		fromOpenSSH, err := LoadEd25519Key([]byte(openSSHKey))
		if err != nil {
			t.Fatalf("failed to parse openssh key: %v", err)
		}
		fromHex, err := LoadEd25519Key([]byte(hexKey))
		if err != nil {
			t.Fatalf("failed to parse hex key: %v", err)
		}

		if !fromPKCS8.Equal(fromOpenSSH) {
			t.Fatalf("parsed keys are not equal (pkcs8 != openssh)")
		}
		if !fromPKCS8.Equal(fromHex) {
			t.Fatalf("parsed keys are not equal (pkcs8 != hex)")
		}
	})
}
