use crate::grcp_clients::Clients;

#[derive(Clone)]
pub struct AppState {
    pub clients: Clients,
}
