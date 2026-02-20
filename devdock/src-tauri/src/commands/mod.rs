pub mod shell;
pub mod window;

use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
pub enum AppError {
    #[error("Window operation failed: {0}")]
    Window(String),
    #[error("Shell operation failed: {0}")]
    Shell(String),
    #[error("IO error: {0}")]
    Io(String),
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::Io(err.to_string())
    }
}
