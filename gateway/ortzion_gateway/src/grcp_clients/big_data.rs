use crate::error::GatewayError;

#[derive(Clone)]
pub struct BigDataClient {
    pub endpoint: String,
}

impl BigDataClient {
    pub fn connect(endpoint: impl Into<String>) -> Self {
        Self {
            endpoint: endpoint.into(),
        }
    }

    pub async fn ping(&self) -> Result<&'static str, GatewayError> {
        let _ = &self.endpoint;
        Ok("big_data")
    }
}
