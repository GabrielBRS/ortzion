use crate::error::GatewayError;

#[derive(Clone, Debug)]
pub struct Principal {
    pub subject: String,
    pub tenant: String,
}

#[derive(Clone)]
pub struct IdentityClient {
    pub endpoint: String,
}

impl IdentityClient {
    pub fn connect(endpoint: impl Into<String>) -> Self {
        Self {
            endpoint: endpoint.into(),
        }
    }

    /// Stub do unary gRPC. Trocar o corpo por tonic quando o .proto existir.
    pub async fn who_am_i(&self, token: &str) -> Result<Principal, GatewayError> {
        let _endpoint = &self.endpoint;
        if token == "invalid" {
            return Err(GatewayError::Unauthenticated);
        }
        if token == "down" {
            return Err(GatewayError::Unavailable { service: "identity" });
        }
        Ok(Principal {
            subject: token.to_string(),
            tenant: "ortzion".into(),
        })
    }
}
