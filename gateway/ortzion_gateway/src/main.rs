mod config;
mod error;
mod grcp_clients;
mod mapping;
mod middleware;
mod routes;
mod state;


use routes::Identity;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let _identity = Identity::new();

    println!("Hello, world!");

    Ok(())
    
}