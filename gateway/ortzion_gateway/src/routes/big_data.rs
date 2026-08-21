use axum::{extract::State, routing::get, Json, Router};

use crate::error::GatewayError;
use crate::routes::PingResponse;
use crate::state::AppState;

pub struct BigData {
    pub routes: Router<AppState>,
}

impl BigData {
    pub fn new() -> Self {
        Self {
            routes: Router::new().route("/ping", get(ping)),
        }
    }
}

async fn ping(State(state): State<AppState>) -> Result<Json<PingResponse>, GatewayError> {
    Ok(Json(PingResponse {
        service: state.clients.big_data.ping().await?,
    }))
}
