mod admit;
mod request_id;

use axum::{middleware::from_fn, middleware::from_fn_with_state, Router};

use crate::state::AppState;

pub fn apply(app: Router<AppState>, state: AppState) -> Router<AppState> {
    app.layer(from_fn_with_state(state, admit::admit))
        .layer(from_fn(request_id::attach))
}
