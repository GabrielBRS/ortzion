//! Formatação pt-BR portada de `src/lib/format.ts` do frontend, usada para
//! compor mensagens de validação idênticas às do mock.

use unicode_normalization::UnicodeNormalization;

fn group_thousands(int_part: u64) -> String {
    let s = int_part.to_string();
    let mut out = String::new();
    for (i, c) in s.chars().enumerate() {
        if i > 0 && (s.len() - i) % 3 == 0 {
            out.push('.');
        }
        out.push(c);
    }
    out
}

/// Equivalente a `fmtNum(v, digits)`: agrupamento com '.', decimais com ',',
/// até `digits` casas decimais (zeros à direita removidos).
pub fn fmt_num(v: f64, digits: usize) -> String {
    let mult = 10f64.powi(digits as i32);
    let r = (v * mult).round() / mult;
    let neg = r.is_sign_negative() && r != 0.0;
    let a = r.abs();
    let int_part = a.trunc() as u64;
    let mut out = String::new();
    if neg {
        out.push('-');
    }
    out.push_str(&group_thousands(int_part));
    if digits > 0 {
        let frac = ((a - int_part as f64) * mult).round() as u64;
        if frac > 0 {
            let mut frac_s = format!("{:0width$}", frac, width = digits);
            while frac_s.ends_with('0') {
                frac_s.pop();
            }
            out.push(',');
            out.push_str(&frac_s);
        }
    }
    out
}

/// Equivalente a `fmtGiB(v)`.
pub fn fmt_gib(v: f64) -> String {
    if v >= 1024.0 {
        format!("{} TiB", fmt_num(v / 1024.0, 1))
    } else {
        format!("{} GiB", fmt_num(v, if v < 10.0 { 1 } else { 0 }))
    }
}

/// Equivalente a `slugify` do frontend (NFD, remove marcas, lowercase, '-').
pub fn slugify(s: &str) -> String {
    let decomposed: String = s.nfd().collect();
    let stripped: String = decomposed
        .chars()
        .filter(|c| !('\u{0300}'..='\u{036f}').contains(c))
        .collect();
    let lower = stripped.to_lowercase();
    let mut out = String::with_capacity(lower.len());
    let mut last_dash = false;
    for c in lower.chars() {
        if c.is_ascii_alphanumeric() {
            out.push(c);
            last_dash = false;
        } else if !last_dash && !out.is_empty() {
            out.push('-');
            last_dash = true;
        }
    }
    while out.ends_with('-') {
        out.pop();
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn num_formatting() {
        assert_eq!(fmt_num(4.0, 1), "4");
        assert_eq!(fmt_num(4.5, 1), "4,5");
        assert_eq!(fmt_num(32768.0, 0), "32.768");
        assert_eq!(fmt_num(131072.0, 0), "131.072");
        assert_eq!(fmt_num(0.5, 1), "0,5");
    }

    #[test]
    fn gib_formatting() {
        assert_eq!(fmt_gib(2048.0), "2 TiB");
        assert_eq!(fmt_gib(512.0), "512 GiB");
        assert_eq!(fmt_gib(2.5), "2,5 GiB");
    }

    #[test]
    fn slugify_ptbr() {
        assert_eq!(slugify("Orzyon — Produção"), "orzyon-producao");
        assert_eq!(slugify("Ministério da Justiça"), "ministerio-da-justica");
        assert_eq!(slugify("gateway agentes!"), "gateway-agentes");
    }
}
