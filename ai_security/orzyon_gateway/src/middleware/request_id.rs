use axum::{
    extract::Request,
    http::{HeaderName, HeaderValue},
    middleware::Next,
    response::Response,
};
use uuid::Uuid;

static X_REQUEST_ID: HeaderName = HeaderName::from_static("x-request-id");

pub async fn attach(mut req: Request, next: Next) -> Response {
    let id = req
        .headers()
        .get(&X_REQUEST_ID)
        .and_then(|v| v.to_str().ok())
        .filter(|s| !s.is_empty())
        .map(str::to_string)
        .unwrap_or_else(|| Uuid::new_v4().to_string());

    if let Ok(value) = HeaderValue::from_str(&id) {
        req.headers_mut().insert(X_REQUEST_ID.clone(), value.clone());
        let mut res = next.run(req).await;
        res.headers_mut().insert(X_REQUEST_ID.clone(), value);
        res
    } else {
        next.run(req).await
    }
}
