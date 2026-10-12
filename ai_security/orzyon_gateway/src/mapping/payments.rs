use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct ChargeRequest {
    pub amount_cents: i64,
}

#[derive(Serialize)]
pub struct ChargeResponse {
    pub payment_id: String,
    pub amount_cents: i64,
}

#[derive(Deserialize)]
pub struct NotifyRequest {
    pub event: String,
}

#[derive(Serialize)]
pub struct AcceptedResponse {
    pub status: &'static str,
}

pub fn charge_to_response(payment_id: String, amount_cents: i64) -> ChargeResponse {
    ChargeResponse {
        payment_id,
        amount_cents,
    }
}
