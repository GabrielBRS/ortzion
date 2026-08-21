use crate::error::GatewayError;

#[derive(Clone)]
pub struct OrtzionClient {
    pub endpoint: String,
}

impl OrtzionClient {
    pub fn connect(endpoint: impl Into<String>) -> Self {
        Self {
            endpoint: endpoint.into(),
        }
    }

    pub async fn ping(&self) -> Result<&'static str, GatewayError> {
        let _ = &self.endpoint;
        Ok("ortzion")
    }
}
