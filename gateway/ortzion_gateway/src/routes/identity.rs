use axum::Router;

pub struct Identity {
    pub routes: Router,
}

impl Identity {
    pub fn new() -> Self {
        Self {
            routes: Router::new(),
        }
    }
}
