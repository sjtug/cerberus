use crate::CerberusMessage;

pub(crate) const fn decompose_blocks_mut(inp: &mut [u32; 16]) -> &mut [u8; 64] {
    unsafe { core::mem::transmute(inp) }
}

/// Scalar fallback solver.
pub struct CerberusSolver {
    message: CerberusMessage,
    attempted_nonces: u32,
    report_slot: u32,
}

impl From<CerberusMessage> for CerberusSolver {
    fn from(message: CerberusMessage) -> Self {
        Self {
            message,
            attempted_nonces: 0,
            report_slot: 0,
        }
    }
}

impl CerberusSolver {
    pub const REPORT_PERIOD: u32 = 16384;
}

impl crate::solver::Solver for CerberusSolver {
    fn set_report_slot(&mut self, tid: u32, threads: u32) {
        self.report_slot = tid * Self::REPORT_PERIOD / threads;
    }

    fn solve<P: FnMut(u32)>(&mut self, mask: u32, mut progress: P) -> Option<(u64, [u32; 8])> {
        let mut msg = core::array::from_fn(|i| {
            u32::from_le_bytes([
                self.message.salt_residual[i * 4],
                self.message.salt_residual[i * 4 + 1],
                self.message.salt_residual[i * 4 + 2],
                self.message.salt_residual[i * 4 + 3],
            ])
        });
        assert!(
            self.message.salt_residual_len + 8 < msg.len() * core::mem::size_of::<u32>(),
            "there must be at least 9 bytes of headroom for the nonce"
        );
        for nonce in 0..u32::MAX {
            let mut nonce_copy = nonce;
            for i in (0..9).rev() {
                let msg = decompose_blocks_mut(&mut msg);
                #[cfg(target_endian = "little")]
                unsafe {
                    *msg.get_unchecked_mut(self.message.salt_residual_len + i) =
                        (nonce_copy % 10) as u8 + b'0';
                }
                #[cfg(target_endian = "big")]
                {
                    static SWAP_DWORD_BYTE_ORDER: [usize; 64] = {
                        let mut data = [0; 64];
                        let mut i = 0;
                        while i < 64 {
                            data[i] = i / 4 * 4 + 3 - i % 4;
                            i += 1;
                        }
                        data
                    };

                    *msg.get_unchecked_mut(
                        SWAP_DWORD_BYTE_ORDER[self.message.salt_residual_len + i],
                    ) = (nonce_copy % 10) as u8 + b'0';
                }
                nonce_copy /= 10;
            }
            debug_assert_eq!(nonce_copy, 0);

            let hash = crate::blake3::compress8(
                &mut self.message.prefix_state,
                &msg,
                0,
                self.message.salt_residual_len as u32 + 9,
                self.message.flags,
            );
            self.attempted_nonces += 1;
            if self.attempted_nonces % Self::REPORT_PERIOD == self.report_slot {
                progress(Self::REPORT_PERIOD);
            }
            if hash[0] & mask as u32 == 0 {
                crate::unlikely();

                return Some((nonce as u64 + self.message.nonce_addend, hash));
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
