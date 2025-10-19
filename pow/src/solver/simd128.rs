use crate::{Align64, CerberusMessage};
use core::arch::wasm32::*;

static LANE_ID_STR_COMBINED_LE_HI: Align64<[u32; 1000]> = {
    let mut out = [0; 1000];
    let mut i = 0;
    while i < 1000 {
        let mut copy = i;
        let mut ds = [0; 4];
        let mut j = 0;
        while j < 3 {
            ds[j] = (copy % 10) as u8 + b'0';
            copy /= 10;
            j += 1;
        }
        out[i] = u32::from_be_bytes(ds);
        i += 1;
    }
    Align64(out)
};

#[expect(dead_code)]
mod static_asserts {
    use super::*;

    const ASSERT_LANE_ID_STR_COMBINED_LE_HI_0: [(); 1] =
        [(); (LANE_ID_STR_COMBINED_LE_HI.0[0] == u32::from_be_bytes(*b"000\x00")) as usize];

    const ASSERT_LANE_ID_STR_COMBINED_LE_HI_1: [(); 1] =
        [(); (LANE_ID_STR_COMBINED_LE_HI.0[1] == u32::from_be_bytes(*b"100\x00")) as usize];

    const ASSERT_LANE_ID_STR_COMBINED_LE_HI_123: [(); 1] =
        [(); (LANE_ID_STR_COMBINED_LE_HI.0[123] == u32::from_be_bytes(*b"321\x00")) as usize];
}

/// SIMD128 Ceberus solver.
///
/// Current implementation: 9-digit out-of-order kernel with 4 way SIMD with quarter-round hotstart granularity.
pub struct CerberusSolver {
    message: CerberusMessage,
    report_slot: u32,
}

impl CerberusSolver {
    const OUTER_LOOP_PERIOD: u32 = 64;
    pub const REPORT_PERIOD: u32 =
        LANE_ID_STR_COMBINED_LE_HI.0.len() as u32 * Self::OUTER_LOOP_PERIOD;
}

impl From<CerberusMessage> for CerberusSolver {
    fn from(message: CerberusMessage) -> Self {
        Self {
            message,
            report_slot: 0,
        }
    }
}

impl CerberusSolver {
    #[inline(never)]
    fn solve_impl<
        const CENTER_WORD_IDX: usize,
        const LANE_ID_WORD_IDX: usize,
        const CONSTANT_WORD_COUNT: usize,
        P: FnMut(u32),
    >(
        &mut self,
        msg_tpl: Align64<[u32; 16]>,
        mask: u32,
        progress: &mut P,
    ) -> Option<(u32, u32)> {
        // inform LLVM that padding is guaranteed to be zero (allows corresponding mixing to be optimized out)
        let mut msg = Align64([0u32; 16]);
        msg.0[..=CENTER_WORD_IDX + 1].copy_from_slice(&msg_tpl.0[..=CENTER_WORD_IDX + 1]);

        let prepared_state = crate::blake3::ingest_message_prefix(
            self.message.prefix_state,
            &msg[..CONSTANT_WORD_COUNT],
            0,
            self.message.salt_residual_len as u32 + 9,
            self.message.flags,
        );

        for word in 0u32..10000 {
            msg[CENTER_WORD_IDX] = u32::from_be_bytes([
                (word % 10) as u8 + b'0',
                ((word / 10) % 10) as u8 + b'0',
                ((word / 100) % 10) as u8 + b'0',
                ((word / 1000) % 10) as u8 + b'0',
            ]);
            for lane_id_idx in 0..(LANE_ID_STR_COMBINED_LE_HI.len() / 4) {
                unsafe {
                    let mut lane_id_value = v128_load(
                        LANE_ID_STR_COMBINED_LE_HI
                            .as_ptr()
                            .add(lane_id_idx * 4)
                            .cast(),
                    );
                    if CENTER_WORD_IDX < LANE_ID_WORD_IDX {
                        lane_id_value = u32x4_shr(lane_id_value, 8);
                    }

                    let mut state = core::array::from_fn(|i| u32x4_splat(prepared_state[i]));
                    let patch = v128_or(u32x4_splat(msg[LANE_ID_WORD_IDX]), lane_id_value);
                    crate::blake3::simd128::compress_mb4_reduced::<
                        CONSTANT_WORD_COUNT,
                        LANE_ID_WORD_IDX,
                    >(&mut state, &msg, patch);

                    let masked = v128_and(state[0], u32x4_splat(mask as _));

                    if !u32x4_all_true(masked) {
                        crate::unlikely();

                        let mut extract = [0u32; 4];
                        v128_store(extract.as_mut_ptr().cast(), masked);
                        let success_lane_idx =
                            extract.iter().position(|x| *x & mask as u32 == 0).unwrap();

                        return Some((word, lane_id_idx as u32 * 4 + success_lane_idx as u32));
                    }
                }
            }

            if word % Self::OUTER_LOOP_PERIOD == self.report_slot {
                progress(Self::OUTER_LOOP_PERIOD * LANE_ID_STR_COMBINED_LE_HI.len() as u32);
            }
        }
        None
    }
}

impl crate::solver::Solver for CerberusSolver {
    fn set_report_slot(&mut self, tid: u32, threads: u32) {
        self.report_slot = tid * Self::OUTER_LOOP_PERIOD / threads;
    }

    fn solve<P: FnMut(u32)>(&mut self, mask: u32, mut progress: P) -> Option<(u64, [u32; 8])> {
        // two digits as lane ID, N=\x00, ? is prefix
        // position % 4 =0: |1234|5678|NNN9
        // position % 4 =1: |123?|4567|NN89
        // position % 4 =2: |12??|3456|N789
        // position % 4 =3: |1???|2345|6789

        let center_word_idx = self.message.salt_residual_len / 4 + 1;
        let position_mod = self.message.salt_residual_len % 4;

        for resid0 in 0..10u32 {
            for resid1 in 0..10u32 {
                let mut msg = self.message.salt_residual;

                match position_mod {
                    0 => {
                        msg[self.message.salt_residual_len] = resid0 as u8 + b'0';
                        msg[self.message.salt_residual_len + 8] = resid1 as u8 + b'0';
                    }
                    1 => {
                        msg[self.message.salt_residual_len + 7] = resid0 as u8 + b'0';
                        msg[self.message.salt_residual_len + 8] = resid1 as u8 + b'0';
                    }
                    2 => {
                        msg[self.message.salt_residual_len] = resid0 as u8 + b'0';
                        msg[self.message.salt_residual_len + 1] = resid1 as u8 + b'0';
                    }
                    3 => {
                        msg[self.message.salt_residual_len] = resid0 as u8 + b'0';
                        msg[self.message.salt_residual_len + 8] = resid1 as u8 + b'0';
                    }
                    _ => unreachable!(),
                }

                let msg = Align64(core::array::from_fn(|i| {
                    u32::from_le_bytes([msg[i * 4], msg[i * 4 + 1], msg[i * 4 + 2], msg[i * 4 + 3]])
                }));

                macro_rules! dispatch {
                    ($center_word_idx:literal) => {
                        if position_mod < 2 {
                            self.solve_impl::<$center_word_idx, { $center_word_idx - 1 }, {$center_word_idx - 1}, _>(
                                msg, mask, &mut progress
                            )
                        } else {
                            self.solve_impl::<$center_word_idx, { $center_word_idx + 1 }, $center_word_idx, _>(
                                msg, mask,
                                &mut progress
                            )
                        }
                    };
                }

                if let Some((middle_word, success_lane_idx)) = match center_word_idx {
                    1 => dispatch!(1),
                    2 => dispatch!(2),
                    3 => dispatch!(3),
                    4 => dispatch!(4),
                    5 => dispatch!(5),
                    6 => dispatch!(6),
                    7 => dispatch!(7),
                    8 => dispatch!(8),
                    9 => dispatch!(9),
                    10 => dispatch!(10),
                    11 => dispatch!(11),
                    12 => dispatch!(12),
                    13 => dispatch!(13),
                    14 => dispatch!(14),
                    15 => dispatch!(15),
                    _ => unreachable!(),
                } {
                    let output_nonce = match position_mod {
                        0 => {
                            10 * middle_word
                                + 100_000 * success_lane_idx
                                + 100_000_000 * resid0
                                + resid1
                        }
                        1 => {
                            100 * middle_word + 1_000_000 * success_lane_idx + 10 * resid0 + resid1
                        }
                        2 => {
                            1000 * middle_word
                                + success_lane_idx
                                + 100_000_000 * resid0
                                + 10_000_000 * resid1
                        }
                        3 => {
                            10000 * middle_word
                                + 10 * success_lane_idx
                                + 100_000_000 * resid0
                                + resid1
                        }
                        _ => unreachable!(),
                    };

                    let nonce = output_nonce as u64 + self.message.nonce_addend;

                    let mut output_state = self.message.prefix_state;
                    let mut msg = self.message.salt_residual;

                    let mut nonce_copy = nonce;
                    for i in (0..9).rev() {
                        msg[self.message.salt_residual_len + i] = (nonce_copy % 10) as u8 + b'0';
                        nonce_copy /= 10;
                    }

                    let mut msg = core::array::from_fn(|i| {
                        u32::from_le_bytes([
                            msg[i * 4],
                            msg[i * 4 + 1],
                            msg[i * 4 + 2],
                            msg[i * 4 + 3],
                        ])
                    });

                    let hash = crate::blake3::compress8(
                        &mut output_state,
                        &mut msg,
                        0,
                        self.message.salt_residual_len as u32 + 9,
                        self.message.flags,
                    );

                    return Some((nonce, hash));
                }
            }
        }

        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_solve_cerberus() {
        crate::solver::tests::test_cerberus_validator::<CerberusSolver, _>(|prefix| {
            CerberusMessage::new(prefix, 0).map(Into::into)
        });
    }
}
