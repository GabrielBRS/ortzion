#[tokio::main]
async fn main() {
    if let Err(err) = orzyon_data_application_cache::composition_root::run().await {
        eprintln!("fatal error: {err:#}");
        std::process::exit(1);
    }
}
