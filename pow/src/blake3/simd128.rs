//! Quad-buffer BLAKE3 routines for SIMD128
use super::*;
use core::arch::wasm32::*;

#[macro_use]
#[path = "loop_macros.rs"]
mod loop_macros;

#[inline(always)]
fn u32x4_ror(x: v128, shift: u32) -> v128 {
    #[allow(unused_unsafe, reason = "workaround rust-analyzer #20640")]
    unsafe {
        v128_or(u32x4_shr(x, shift), u32x4_shl(x, 32 - shift))
    }
}

#[inline(always)]
fn g4(va: &mut v128, vb: &mut v128, vc: &mut v128, vd: &mut v128, x: v128, y: v128) {
    #[allow(unused_unsafe)]
    unsafe {
        *va = u32x4_add(*va, u32x4_add(*vb, x));
        *vd = v128_xor(*vd, *va);
        *vd = u32x4_ror(*vd, 16);
        *vc = u32x4_add(*vc, *vd);
        *vb = v128_xor(*vb, *vc);
        *vb = u32x4_ror(*vb, 12);
        *va = u32x4_add(*va, u32x4_add(*vb, y));
        *vd = v128_xor(*vd, *va);
        *vd = u32x4_ror(*vd, 8);
        *vc = u32x4_add(*vc, *vd);
        *vb = v128_xor(*vb, *vc);
        *vb = u32x4_ror(*vb, 7);
    }
}

#[inline(always)]
pub(crate) fn compress_mb4<const PATCH_1: usize>(
    v: &mut [v128; 16],
    block_template: &[u32; 16],
    patch_1: v128,
) {
    unsafe {
        repeat!(7; i, {
            macro_rules! g4 {
                ($f:ident; $a:literal, $b:literal, $c:literal, $d:literal, $x:literal, $y:literal) => {{
                    let [va, vb, vc, vd] = v.get_disjoint_unchecked_mut([$a, $b, $c, $d]);
                    let ix = MESSAGE_SCHEDULE[i][$x];
                    let iy = MESSAGE_SCHEDULE[i][$y];
                    $f(
                        va,
                        vb,
                        vc,
                        vd,
                        if ix == PATCH_1 {
                            patch_1
                        } else {
                            u32x4_splat(block_template[ix])
                        },
                        if iy == PATCH_1 {
                            patch_1
                        } else {
                            u32x4_splat(block_template[iy])
                        },
                    );
                }};
                ($a:literal, $b:literal, $c:literal, $d:literal, $x:literal, $y:literal) => {{
                    g4!(g4; $a, $b, $c, $d, $x, $y);
                }};
            }
            g4!(0, 4, 8, 12, 0, 1);
            g4!(1, 5, 9, 13, 2, 3);
            g4!(2, 6, 10, 14, 4, 5);
            g4!(3, 7, 11, 15, 6, 7);

            g4!(0, 5, 10, 15, 8, 9);
            g4!(1, 6, 11, 12, 10, 11);
            g4!(2, 7, 8, 13, 12, 13);
            g4!(3, 4, 9, 14, 14, 15);
        });

        repeat!(8; i, {
            v[i] = v128_xor(v[i], v[i + 8]);
        });
    }
}

#[cfg(test)]
#[allow(unused_unsafe)]
mod tests {
    use blake3::Hasher;

    use super::*;

    // The mixing function, G, which mixes either a column or a diagonal.
    fn gref(state: &mut [u32; 16], a: usize, b: usize, c: usize, d: usize, mx: u32, my: u32) {
        state[a] = state[a].wrapping_add(state[b]).wrapping_add(mx);
        state[d] = (state[d] ^ state[a]).rotate_right(16);
        state[c] = state[c].wrapping_add(state[d]);
        state[b] = (state[b] ^ state[c]).rotate_right(12);
        state[a] = state[a].wrapping_add(state[b]).wrapping_add(my);
        state[d] = (state[d] ^ state[a]).rotate_right(8);
        state[c] = state[c].wrapping_add(state[d]);
        state[b] = (state[b] ^ state[c]).rotate_right(7);
    }

    #[test]
    fn test_g_function() {
        let mut state = core::array::from_fn(|i| crate::blake3::IV[i % 8].wrapping_add(i as u32));
        let mut state_v: [_; 16] = core::array::from_fn(|i| unsafe { u32x4_splat(state[i] as _) });
        gref(
            &mut state,
            0,
            4,
            8,
            12,
            crate::blake3::IV[0],
            crate::blake3::IV[1],
        );
        let [va, vb, vc, vd] = state_v.get_disjoint_mut([0, 4, 8, 12]).unwrap();
        g4(
            va,
            vb,
            vc,
            vd,
            unsafe { u32x4_splat(crate::blake3::IV[0] as _) },
            unsafe { u32x4_splat(crate::blake3::IV[1] as _) },
        );

        for i in 0..16 {
            assert_eq!(
                unsafe { u32x4_extract_lane::<0>(state_v[i]) as u32 },
                state[i],
                "word {}: expected: {:08x}, results: {:08x}",
                i,
                state[i],
                unsafe { u32x4_extract_lane::<0>(state_v[i]) as u32 }
            );
        }
    }

    #[test]
    fn test_compress_mb4() {
        let mut v = [0u32; 16];
        v[..8].copy_from_slice(&crate::blake3::IV);
        v[8..12].copy_from_slice(&crate::blake3::IV[..4]);
        v[12] = 0;
        v[13] = 0;
        v[14] = 4;
        v[15] = 0x0b;
        let mut v = core::array::from_fn(|i| u32x4_splat(v[i] as _));
        let mut block = [0u32; 16];
        block[0] = u32::from_le_bytes(*b"IETF");
        compress_mb4::<4>(&mut v, &block, u32x4_splat(0));
        let expected = [
            0x1edea283, 0xabe6f4e6, 0x24896868, 0xcfc04e8f, 0x9470c54c, 0xff82a646, 0xd6b4cbd1,
            0xe2815116,
        ];
        let mut results = [0u32; 8];
        for i in 0..8 {
            results[i] = u32x4_extract_lane::<0>(v[i]) as u32;
        }
        assert_eq!(
            results, expected,
            "expected: {:08x?}, results: {:08x?}",
            expected, results
        );
        let mut hasher = Hasher::new();
        hasher.update(b"IETF");
        let hash = hasher.finalize();
        let hash = hash.as_bytes();
        let mut expected = [0u32; 8];
        for i in 0..8 {
            expected[i] = u32::from_le_bytes(hash[i * 4..i * 4 + 4].try_into().unwrap());
        }
        assert_eq!(results, expected);
    }
}
