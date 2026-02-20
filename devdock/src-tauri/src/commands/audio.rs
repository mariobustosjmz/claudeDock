use base64::{engine::general_purpose, Engine as _};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};

use super::AppError;

pub struct RecordingState {
    pub samples: Arc<Mutex<Vec<f32>>>,
    pub is_recording: Arc<Mutex<bool>>,
    pub sample_rate: Arc<Mutex<u32>>,
    pub channels: Arc<Mutex<u16>>,
}

impl Default for RecordingState {
    fn default() -> Self {
        Self {
            samples: Arc::new(Mutex::new(Vec::new())),
            is_recording: Arc::new(Mutex::new(false)),
            sample_rate: Arc::new(Mutex::new(44100)),
            channels: Arc::new(Mutex::new(1)),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AudioResult {
    pub wav_base64: String,
    pub duration_seconds: f32,
    pub sample_rate: u32,
}

#[tauri::command]
pub async fn validate_microphone() -> Result<String, AppError> {
    let host = cpal::default_host();
    let device = host
        .default_input_device()
        .ok_or_else(|| AppError::Audio("No microphone found".to_string()))?;
    let name = device
        .name()
        .unwrap_or_else(|_| "Unknown device".to_string());
    device
        .supported_input_configs()
        .map_err(|e| AppError::Audio(format!("Cannot access microphone: {e}")))?
        .next()
        .ok_or_else(|| AppError::Audio("Microphone has no supported formats".to_string()))?;
    Ok(name)
}

#[tauri::command]
pub async fn start_recording(
    app: AppHandle,
    state: State<'_, RecordingState>,
) -> Result<(), AppError> {
    {
        let mut is_rec = state
            .is_recording
            .lock()
            .map_err(|_| AppError::Audio("Lock poisoned".to_string()))?;
        if *is_rec {
            return Err(AppError::Audio("Already recording".to_string()));
        }
        *is_rec = true;
    }

    state
        .samples
        .lock()
        .map_err(|_| AppError::Audio("Lock poisoned".to_string()))?
        .clear();

    let samples_clone = Arc::clone(&state.samples);
    let is_recording_clone = Arc::clone(&state.is_recording);
    let sample_rate_state = Arc::clone(&state.sample_rate);
    let channels_state = Arc::clone(&state.channels);

    let app_clone = app.clone();
    std::thread::spawn(move || {
        let host = cpal::default_host();
        let device = match host.default_input_device() {
            Some(d) => d,
            None => {
                if let Ok(mut r) = is_recording_clone.lock() {
                    *r = false;
                }
                let _ = app_clone.emit("audio-error", "No microphone found");
                return;
            }
        };

        let config = match device.default_input_config() {
            Ok(c) => c,
            Err(e) => {
                if let Ok(mut r) = is_recording_clone.lock() {
                    *r = false;
                }
                let _ = app_clone.emit("audio-error", format!("Microphone config error: {e}"));
                return;
            }
        };

        if let Ok(mut r) = sample_rate_state.lock() {
            *r = config.sample_rate().0;
        }
        if let Ok(mut c) = channels_state.lock() {
            *c = config.channels();
        }

        let samples_inner = Arc::clone(&samples_clone);
        let is_rec_inner = Arc::clone(&is_recording_clone);
        let app_err = app_clone.clone();

        let stream = device.build_input_stream(
            &config.into(),
            move |data: &[f32], _: &cpal::InputCallbackInfo| {
                if let Ok(rec) = is_rec_inner.lock() {
                    if !*rec {
                        return;
                    }
                }
                if let Ok(mut s) = samples_inner.lock() {
                    s.extend_from_slice(data);
                }
            },
            move |err| {
                let _ = app_err.emit("audio-error", format!("Stream error: {err}"));
            },
            None,
        );

        match stream {
            Ok(s) => {
                if s.play().is_ok() {
                    loop {
                        std::thread::sleep(std::time::Duration::from_millis(100));
                        if let Ok(rec) = is_recording_clone.lock() {
                            if !*rec {
                                break;
                            }
                        }
                    }
                }
            }
            Err(e) => {
                if let Ok(mut r) = is_recording_clone.lock() {
                    *r = false;
                }
                let _ = app_clone.emit("audio-error", format!("Failed to open stream: {e}"));
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn stop_recording(
    _app: AppHandle,
    state: State<'_, RecordingState>,
) -> Result<AudioResult, AppError> {
    {
        let mut is_rec = state
            .is_recording
            .lock()
            .map_err(|_| AppError::Audio("Lock poisoned".to_string()))?;
        *is_rec = false;
    }

    tokio::time::sleep(std::time::Duration::from_millis(200)).await;

    let samples = state
        .samples
        .lock()
        .map_err(|_| AppError::Audio("Lock poisoned".to_string()))?
        .clone();

    let sample_rate = *state
        .sample_rate
        .lock()
        .map_err(|_| AppError::Audio("Lock poisoned".to_string()))?;

    let channels = *state
        .channels
        .lock()
        .map_err(|_| AppError::Audio("Lock poisoned".to_string()))?;

    let duration = if sample_rate > 0 && channels > 0 {
        samples.len() as f32 / (sample_rate as f32 * channels as f32)
    } else {
        0.0
    };

    let wav_bytes = encode_wav(&samples, sample_rate, channels)
        .map_err(|e| AppError::Audio(e.to_string()))?;

    let wav_base64 = general_purpose::STANDARD.encode(&wav_bytes);

    Ok(AudioResult {
        wav_base64,
        duration_seconds: duration,
        sample_rate,
    })
}

fn encode_wav(samples: &[f32], sample_rate: u32, channels: u16) -> Result<Vec<u8>, hound::Error> {
    let mut cursor = std::io::Cursor::new(Vec::new());
    let spec = hound::WavSpec {
        channels,
        sample_rate,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };
    let mut writer = hound::WavWriter::new(&mut cursor, spec)?;
    for &sample in samples {
        let int_sample = (sample.clamp(-1.0, 1.0) * i16::MAX as f32) as i16;
        writer.write_sample(int_sample)?;
    }
    writer.finalize()?;
    Ok(cursor.into_inner())
}
