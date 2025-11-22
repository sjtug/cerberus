#[cfg(any(test, not(all(target_arch = "wasm32", target_feature = "simd128"))))]
pub mod scalar;

#[cfg(all(target_arch = "wasm32", target_feature = "simd128"))]
pub mod simd128;

/// A generic solver trait
pub trait Solver {
    /// Perform precomputation and set the time slot for reporting progress.
    fn set_report_slot(&mut self, tid: u32, threads: u32);

    /// Returns a valid nonce and its corresponding hash value.
    ///
    /// Returns None when the solver cannot solve the prefix.
    ///
    /// Progress report callback is periodically called with the number of _additional_ attempts made
    /// since the last report.
    ///
    /// Failure is usually because the key space is exhausted (or presumed exhausted).
    /// It should by design happen extremely rarely for common difficulty settings.
    fn solve<P: FnMut(u32)>(&mut self, mask: u32, progress: P) -> Option<([u32; 2], [u32; 8])>;
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;

    #[allow(unused)]
    mod legacy_check_dubit {
        pub fn check_leading_zero_dubits(n: usize) -> fn(&[u8; 32], usize) -> bool {
            match n {
                0..=16 => check_small,
                _ => check_general,
            }
        }

        fn check_small(hash: &[u8; 32], n: usize) -> bool {
            let first_word: u32 = (hash[0] as u32) << 24
                | (hash[1] as u32) << 16
                | (hash[2] as u32) << 8
                | (hash[3] as u32);
            first_word.leading_zeros() >= (n as u32 * 2)
        }

        fn check_general(hash: &[u8; 32], n: usize) -> bool {
            panic!("I'm lazy")
        }
    }

    pub(crate) fn test_cerberus_validator<
        S: Solver,
        F: for<'a> FnMut(&'a [u8; 64]) -> Option<S>,
    >(
        mut factory: F,
    ) {
        for df in 6..=8 {
            let mask = crate::compute_mask_cerberus(df.try_into().unwrap());

            let test_seed: [u8; 64] = core::array::from_fn(|i| b'a'.wrapping_add(i as u8));

            let Some(mut solver) = factory(&test_seed) else {
                panic!("solver is None for seed");
            };

            let (nonce, hash) = solver.solve(mask, |_| {}).unwrap();
            let mut ref_hasher = ::blake3::Hasher::new();
            ref_hasher.update(&test_seed);
            let final_nonce = (nonce[0] as u64 | (nonce[1] as u64) << 32).to_le_bytes();
            ref_hasher.update(&final_nonce);
            let ref_hash = ref_hasher.finalize();
            let ref_hash_bytes = ref_hash.as_bytes();
            let ref_hash = core::array::from_fn(|i| {
                u32::from_le_bytes([
                    ref_hash_bytes[i * 4],
                    ref_hash_bytes[i * 4 + 1],
                    ref_hash_bytes[i * 4 + 2],
                    ref_hash_bytes[i * 4 + 3],
                ])
            });
            let hit = (ref_hash[0] & mask) == 0;
            assert_eq!(hash, ref_hash, "incorrect output: {:?}", nonce);
            assert!(hit);
            assert!(legacy_check_dubit::check_leading_zero_dubits(df as usize)(
                &ref_hash_bytes,
                df as usize
            ));
        }
    }
}
