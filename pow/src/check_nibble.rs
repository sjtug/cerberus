pub fn check_leading_zero_nibbles(n: usize) -> fn(&[u8; 32], usize) -> bool {
    match n {
        0 => check_const::<0, false>,
        1 => check_const::<0, true>,
        2 => check_const::<1, false>,
        3 => check_const::<1, true>,
        4 => check_const::<2, false>,
        5 => check_const::<2, true>,
        6 => check_const::<3, false>,
        7 => check_const::<3, true>,
        8 => check_const::<4, false>,
        _ => check_general,
    }
}

fn check_general(hash: &[u8; 32], n: usize) -> bool {
    let bytes = n / 2;
    let half = n % 2 == 1;
    // Check full bytes first
    if !hash[..bytes].iter().all(|&b| b == 0) {
        return false;
    }
    // Check the remaining nibble if needed
    if half {
        hash[bytes] & 0xF0 == 0
    } else {
        true
    }
}

fn check_const<const BYTES: usize, const HALF: bool>(hash: &[u8; 32], _: usize) -> bool {
    // Check full bytes first
    if !hash[..BYTES].iter().all(|&b| b == 0) {
        return false;
    }

    // Check the remaining nibble if needed
    if HALF {
        hash[BYTES] & 0xF0 == 0
    } else {
        true
    }
}
