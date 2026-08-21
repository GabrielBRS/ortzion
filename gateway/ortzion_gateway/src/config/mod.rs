pub struct Config {
    pub bind: String,
    pub identity_grpc: String,
    pub authorization_grpc: String,
    pub payments_grpc: String,
    pub smart_finance_grpc: String,
    pub ortzion_grpc: String,
    pub big_data_grpc: String,
}

impl Config {
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            bind: env("GATEWAY_BIND", "0.0.0.0:8080"),
            identity_grpc: env("IDENTITY_GRPC", "http://127.0.0.1:50051"),
            authorization_grpc: env("AUTHORIZATION_GRPC", "http://127.0.0.1:50052"),
            payments_grpc: env("PAYMENTS_GRPC", "http://127.0.0.1:50053"),
            smart_finance_grpc: env("SMART_FINANCE_GRPC", "http://127.0.0.1:50054"),
            ortzion_grpc: env("ORTZION_GRPC", "http://127.0.0.1:50055"),
            big_data_grpc: env("BIG_DATA_GRPC", "http://127.0.0.1:50056"),
        })
    }
}

fn env(key: &str, default: &str) -> String {
    std::env::var(key).unwrap_or_else(|_| default.into())
}
