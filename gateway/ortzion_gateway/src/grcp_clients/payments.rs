use crate::error::GatewayError;

#[derive(Clone)]
pub struct PaymentsClient {
    pub endpoint: String,
}

impl PaymentsClient {
    pub fn connect(endpoint: impl Into<String>) -> Self {
        Self {
            endpoint: endpoint.into(),
        }
    }

    pub async fn ping(&self) -> Result<&'static str, GatewayError> {
        let _ = &self.endpoint;
        Ok("payments")
    }

    pub async fn charge(&self, amount_cents: i64) -> Result<String, GatewayError> {
        if amount_cents <= 0 {
            return Err(GatewayError::BadRequest {
                message: "amount_cents precisa ser > 0".into(),
            });
        }
        Ok(format!("pay_{amount_cents}"))
    }

    pub async fn notify(&self, event: String) -> Result<(), GatewayError> {
        tracing::info!(endpoint = %self.endpoint, %event, "payments.notify (async)");
        Ok(())
    }
}
