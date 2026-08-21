use axum::{
    extract::State,
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};

use crate::error::GatewayError;
use crate::mapping::payments::{
    charge_to_response, AcceptedResponse, ChargeRequest, ChargeResponse, NotifyRequest,
};
use crate::routes::PingResponse;
use crate::state::AppState;

pub struct Payments {
    pub routes: Router<AppState>,
}

impl Payments {
    pub fn new() -> Self {
        Self {
            routes: Router::new()
                .route("/ping", get(ping))
                .route("/charges", post(charge))
                .route("/notifications", post(notify)),
        }
    }
}

async fn ping(State(state): State<AppState>) -> Result<Json<PingResponse>, GatewayError> {
    Ok(Json(PingResponse {
        service: state.clients.payments.ping().await?,
    }))
}

async fn charge(
    State(state): State<AppState>,
    Json(body): Json<ChargeRequest>,
) -> Result<Json<ChargeResponse>, GatewayError> {
    let payment_id = state.clients.payments.charge(body.amount_cents).await?;
    Ok(Json(charge_to_response(payment_id, body.amount_cents)))
}

async fn notify(
    State(state): State<AppState>,
    Json(body): Json<NotifyRequest>,
) -> (StatusCode, Json<AcceptedResponse>) {
    let client = state.clients.payments.clone();
    tokio::spawn(async move {
        let _ = client.notify(body.event).await;
    });
    (
        StatusCode::ACCEPTED,
        Json(AcceptedResponse { status: "accepted" }),
    )
}
