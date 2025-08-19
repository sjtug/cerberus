/**
 * Utility formatter function for enforcing Bidi Structured Text by using UCC
 *
 * List inlined from data extracted from CLDR v27 & v28
 * To verify/recreate, use the following:
 *
 *    git clone https://github.com/unicode-cldr/cldr-misc-full.git
 *    cd cldr-misc-full/main/
 *    grep characterOrder -r . | tr '"/' '\t' | cut -f2,6 | grep -C4 right-to-left
 *
 * @private
 */
export declare function biDiMarkText(text: string, locale: string): string;
