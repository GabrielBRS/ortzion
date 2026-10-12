pub mod authorization;
pub mod big_data;
pub mod identity;
pub mod ortzion;
pub mod payments;
pub mod smart_finance;

use crate::config::Config;

#[derive(Clone)]
pub struct Clients {
    pub identity: identity::IdentityClient,
    pub authorization: authorization::AuthorizationClient,
    pub payments: payments::PaymentsClient,
    pub smart_finance: smart_finance::SmartFinanceClient,
    pub ortzion: ortzion::OrtzionClient,
    pub big_data: big_data::BigDataClient,
}

impl Clients {
    pub async fn connect(cfg: &Config) -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            identity: identity::IdentityClient::connect(&cfg.identity_grpc),
            authorization: authorization::AuthorizationClient::connect(&cfg.authorization_grpc),
            payments: payments::PaymentsClient::connect(&cfg.payments_grpc),
            smart_finance: smart_finance::SmartFinanceClient::connect(&cfg.smart_finance_grpc),
            ortzion: ortzion::OrtzionClient::connect(&cfg.ortzion_grpc),
            big_data: big_data::BigDataClient::connect(&cfg.big_data_grpc),
        })
    }
}
