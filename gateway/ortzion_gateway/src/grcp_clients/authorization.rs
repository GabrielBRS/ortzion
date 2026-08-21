use crate::error::GatewayError;
use crate::grcp_clients::identity::Principal;

#[derive(Clone, Debug)]
pub struct Decision {
    pub allowed: bool,
    pub reason: String,
}

#[derive(Clone)]
pub struct AuthorizationClient {
    pub endpoint: String,
}

impl AuthorizationClient {
    pub fn connect(endpoint: impl Into<String>) -> Self {
        Self {
            endpoint: endpoint.into(),
        }
    }

    pub async fn authorize(
        &self,
        principal: &Principal,
        method: &str,
        path: &str,
    ) -> Result<Decision, GatewayError> {
        let _ = method;
        tracing::debug!(endpoint = %self.endpoint, %path, subject = %principal.subject);
        if path.contains("/deny") {
            return Ok(Decision {
                allowed: false,
                reason: format!("{} sem permissão em {path}", principal.subject),
            });
        }
        Ok(Decision {
            allowed: true,
            reason: "allow".into(),
        })
    }
}
