use crate::error::GatewayError;

#[derive(Clone)]
pub struct SmartFinanceClient {
    pub endpoint: String,
}

impl SmartFinanceClient {
    pub fn connect(endpoint: impl Into<String>) -> Self {
        Self {
            endpoint: endpoint.into(),
        }
    }

    pub async fn ping(&self) -> Result<&'static str, GatewayError> {
        let _ = &self.endpoint;
        Ok("smart_finance")
    }
}
