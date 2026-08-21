use axum::{routing::get, Json, Router};

use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/health/live", get(live))
        .route("/health/ready", get(ready))
}

async fn live() -> Json<serde_json::Value> {
    Json(serde_json::json!({ "status": "ok" }))
}

async fn ready() -> Json<serde_json::Value> {
    Json(serde_json::json!({ "status": "ok" }))
}
