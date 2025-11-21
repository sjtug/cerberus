use crate::CerberusMessage;

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

    fn solve<P: FnMut(u32)>(&mut self, mask: u32, mut progress: P) -> Option<([u32; 2], [u32; 8])> {
        let mut msg = [0; 16];
        msg[0] = self.message.batch_id;
        for nonce in 0..u32::MAX {
            msg[1] = nonce;

            let hash = crate::blake3::compress8(
                &self.message.midstate,
                &msg,
                0,
                8,
                self.message.trailing_block_flags(),
            );
            self.attempted_nonces += 1;
            if self.attempted_nonces % Self::REPORT_PERIOD == self.report_slot {
                progress(Self::REPORT_PERIOD);
            }
            if hash[0] & mask as u32 == 0 {
                crate::unlikely();

                return Some(([self.message.batch_id, nonce], hash));
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
