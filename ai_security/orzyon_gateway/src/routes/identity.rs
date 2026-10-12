use axum::{extract::Extension, routing::get, Json, Router};

use crate::grcp_clients::identity::Principal;
use crate::mapping::identity::{principal_to_me, MeResponse};
use crate::state::AppState;

pub struct Identity {
    pub routes: Router<AppState>,
}

impl Identity {
    pub fn new() -> Self {
        Self {
            routes: Router::new().route("/me", get(me)),
        }
    }
}

async fn me(Extension(principal): Extension<Principal>) -> Json<MeResponse> {
    Json(principal_to_me(&principal))
}
