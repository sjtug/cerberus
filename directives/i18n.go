package directives

import (
	"io/fs"

	"github.com/invopop/ctxi18n"
)

func LoadI18n(fs fs.FS) {
	if err := ctxi18n.LoadWithDefault(fs, "en"); err != nil {
		panic(err)
	}
}
