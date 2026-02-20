pub mod audio;
pub mod context;
pub mod menu;
pub mod preview;
pub mod process;
pub mod screenshot;
pub mod shell;
pub mod snapshot;
pub mod update;
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
    #[error("Screenshot operation failed: {0}")]
    Screenshot(String),
    #[error("Audio operation failed: {0}")]
    Audio(String),
    #[error("Process operation failed: {0}")]
    Process(String),
    #[error("Updater operation failed: {0}")]
    Updater(String),
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::Io(err.to_string())
    }
}
