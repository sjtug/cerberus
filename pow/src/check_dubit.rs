pub fn check_leading_zero_dubits(n: usize) -> fn(&[u8; 32], usize) -> bool {
    match n {
        0..=16 => check_small,
        _ => check_general,
    }
}

fn check_small(hash: &[u8; 32], n: usize) -> bool {
    let first_word: u32 = (hash[0] as u32) << 24 | (hash[1] as u32) << 16 | (hash[2] as u32) << 8 | (hash[3] as u32);
    first_word.leading_zeros() >= (n as u32 * 2)
}

fn check_general(hash: &[u8; 32], n: usize) -> bool {
    panic!("I'm lazy")
}