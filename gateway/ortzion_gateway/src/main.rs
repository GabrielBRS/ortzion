mod routes;
mod clients;

use routes::Identity;

fn main() {
    let _identity = Identity::new();
    println!("Hello, world!");
}
