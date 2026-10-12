//! Configuração via variáveis de ambiente (ver .env.example).

#[derive(Debug, Clone)]
pub struct Config {
    pub database_url: String,
    pub bind_addr: String,
    pub demo_mode: bool,
    pub allowed_origins: Vec<String>,
    pub session_ttl_hours: i64,
    pub run_seed: bool,
    pub cookie_secure: bool,
}

impl Config {
    pub fn from_env() -> Self {
        let get = |k: &str| std::env::var(k).ok();
        let demo_mode = get("DEMO_MODE").map(|v| v != "false" && v != "0").unwrap_or(true);
        let allowed_origins = get("ALLOWED_ORIGINS")
            .unwrap_or_else(|| "http://localhost:5173,http://127.0.0.1:5173".to_string())
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();
        Self {
            database_url: get("DATABASE_URL").unwrap_or_else(|| {
                "postgres://orzyon:orzyon@127.0.0.1:5432/orzyon".to_string()
            }),
            bind_addr: get("BIND_ADDR").unwrap_or_else(|| "127.0.0.1:8080".to_string()),
            demo_mode,
            allowed_origins,
            session_ttl_hours: get("SESSION_TTL_HOURS")
                .and_then(|v| v.parse().ok())
                .unwrap_or(12),
            run_seed: get("RUN_SEED").map(|v| v != "false" && v != "0").unwrap_or(true),
            cookie_secure: get("COOKIE_SECURE").map(|v| v == "true" || v == "1").unwrap_or(false),
        }
    }
}
