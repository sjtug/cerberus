use crate::CerberusMessage;
use core::arch::wasm32::*;

/// SIMD128 Ceberus solver.
pub struct CerberusSolver {
    message: CerberusMessage,
    report_slot: u32,
}

impl CerberusSolver {
    const REPORT_PERIOD: u32 = 8192;
}

impl From<CerberusMessage> for CerberusSolver {
    fn from(message: CerberusMessage) -> Self {
        Self {
            message,
            report_slot: 0,
        }
    }
}

impl crate::solver::Solver for CerberusSolver {
    fn set_report_slot(&mut self, tid: u32, threads: u32) {
        self.report_slot = tid * Self::REPORT_PERIOD / threads;
    }

    #[inline(never)]
    fn solve<P: FnMut(u32)>(&mut self, mask: u32, mut progress: P) -> Option<([u32; 2], [u32; 8])> {
        let mut msg = [0; 16];
        msg[0] = self.message.batch_id;

        let midstate = crate::blake3::setup_block(
            self.message.midstate,
            0,
            8,
            self.message.trailing_block_flags(),
        );
        let midstate = core::array::from_fn(|i| u32x4_splat(midstate[i] as _));

        let mut nonce = u32x4(0, 1, 2, 3);
        let four = u32x4_splat(4);
        let maskv = u32x4_splat(mask);
        for rep in 0..(u32::MAX / 4) {
            let mut state = midstate;
            crate::blake3::simd128::compress_mb4::<1>(&mut state, &msg, nonce);
            let masked = v128_and(state[0], maskv);
            nonce = u32x4_add(nonce, four);

            if !u32x4_all_true(masked) {
                crate::unlikely();

                let mut extract = [0u32; 4];
                unsafe { v128_store(extract.as_mut_ptr().cast(), masked) };
                let success_lane_idx = extract.iter().position(|x| *x & mask == 0).unwrap();
                msg[1] = rep * 4 + success_lane_idx as u32;

                let hash = crate::blake3::compress8(
                    &self.message.midstate,
                    &msg,
                    0,
                    8,
                    self.message.trailing_block_flags(),
                );

                return Some(([self.message.batch_id, msg[1]], hash));
            }

            if rep % Self::REPORT_PERIOD == self.report_slot {
                progress(Self::REPORT_PERIOD * 4);
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
