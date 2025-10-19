#[rustfmt::skip]
macro_rules! repeat7 {
    ($i:ident, $b:block) => {
        { let $i = 0; $b; }
        { let $i = 1; $b; }
        { let $i = 2; $b; }
        { let $i = 3; $b; }
        { let $i = 4; $b; }
        { let $i = 5; $b; }
        { let $i = 6; $b; }
    };
}
