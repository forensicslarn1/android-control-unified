//! Field Service Ledger: every local ADB invocation is returned as a receipt-ready result.

use std::{path::Path, process::Command};
use thiserror::Error;

use crate::models::DeviceInfo;

#[derive(Debug, Error)]
pub enum AdbError {
    #[error("Could not launch adb: {0}")]
    Io(#[from] std::io::Error),
    #[error("ADB returned no authorized devices. Enable USB debugging and accept the phone prompt.")]
    NoDevice,
}

#[derive(Clone, Debug)]
pub struct AdbOutput {
    pub command: String,
    pub output: String,
    pub success: bool,
}

pub fn run(adb: &Path, serial: Option<&str>, arguments: &[&str]) -> Result<AdbOutput, AdbError> {
    let mut command = Command::new(adb);
    if let Some(serial) = serial {
        command.arg("-s").arg(serial);
    }
    command.args(arguments);
    let output = command.output()?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    let joined = if stderr.trim().is_empty() { stdout.trim().to_owned() } else { format!("{}\n{}", stdout.trim(), stderr.trim()).trim().to_owned() };
    let visible = format!("{} {}", adb.display(), arguments.join(" "));
    Ok(AdbOutput { command: visible, output: joined, success: output.status.success() })
}

pub fn find_device(adb: &Path) -> Result<String, AdbError> {
    let output = run(adb, None, &["devices"])?;
    output
        .output
        .lines()
        .skip(1)
        .filter_map(|line| line.split_once('\t'))
        .find(|(_, status)| *status == "device")
        .map(|(serial, _)| serial.to_owned())
        .ok_or(AdbError::NoDevice)
}

pub fn inspect(adb: &Path) -> Result<(DeviceInfo, Vec<String>), AdbError> {
    let serial = find_device(adb)?;
    let get_prop = |key: &str| run(adb, Some(&serial), &["shell", "getprop", key]).map(|value| value.output);
    let info = DeviceInfo {
        serial: serial.clone(),
        manufacturer: get_prop("ro.product.manufacturer")?,
        model: get_prop("ro.product.model")?,
        android: get_prop("ro.build.version.release")?,
        sdk: get_prop("ro.build.version.sdk")?,
    };
    let package_output = run(adb, Some(&serial), &["shell", "pm", "list", "packages", "-u"])?;
    let packages = package_output.output.lines().filter_map(|line| line.strip_prefix("package:")).map(str::to_owned).collect();
    Ok((info, packages))
}
