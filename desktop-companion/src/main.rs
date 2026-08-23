//! Field Service Ledger native app: restrained, beginner-safe UI with a visible local command trail.

mod adb;
mod catalog;
mod models;

use std::{collections::HashMap, path::PathBuf};

use eframe::egui::{self, Color32, RichText, Stroke};
use models::{CommandReceipt, DeviceInfo, PackageDefinition};

const INK: Color32 = Color32::from_rgb(20, 37, 58);
const PAPER: Color32 = Color32::from_rgb(246, 242, 234);
const LIME: Color32 = Color32::from_rgb(200, 240, 74);
const MUTED: Color32 = Color32::from_rgb(104, 117, 132);
const UAD_REPO: &str = "https://github.com/Universal-Debloater-Alliance/universal-android-debloater-next-generation";

#[derive(Clone, Copy, PartialEq)]
enum Page { Desk, Debloat, Privacy, Profiles, Updates }

struct App {
    page: Page,
    adb_path: PathBuf,
    device: Option<DeviceInfo>,
    packages: Vec<String>,
    catalog: HashMap<String, PackageDefinition>,
    selected: Vec<String>,
    query: String,
    recommended_only: bool,
    remove_mode: bool,
    receipts: Vec<CommandReceipt>,
    status: String,
    update_endpoint: String,
}

impl Default for App {
    fn default() -> Self {
        Self {
            page: Page::Desk,
            adb_path: PathBuf::from(if cfg!(windows) { "adb.exe" } else { "adb" }),
            device: None,
            packages: Vec::new(),
            catalog: HashMap::new(),
            selected: Vec::new(),
            query: String::new(),
            recommended_only: true,
            remove_mode: false,
            receipts: vec![CommandReceipt::browser("Session waiting", "No local ADB command issued", "Plug in a phone, enable USB debugging, then inspect the device.", true)],
            status: "Waiting for a local ADB connection.".to_owned(),
            update_endpoint: "https://api.github.com/repos/REPLACE_WITH_YOUR_ORG/android-control-center/releases/latest".to_owned(),
        }
    }
}

impl App {
    fn receipt(&mut self, label: impl Into<String>, result: Result<adb::AdbOutput, adb::AdbError>, restore: Option<String>) {
        match result {
            Ok(result) => self.receipts.insert(0, CommandReceipt { label: label.into(), command: result.command, output: result.output, success: result.success, restore }),
            Err(error) => self.receipts.insert(0, CommandReceipt::browser(label, "local adb invocation", error.to_string(), false)),
        }
        self.receipts.truncate(60);
    }

    fn inspect_device(&mut self) {
        match adb::inspect(&self.adb_path) {
            Ok((device, packages)) => {
                let label = format!("Inventoried {} package IDs", packages.len());
                self.device = Some(device);
                self.packages = packages;
                self.status = "Device authorized and inventoried locally.".to_owned();
                self.receipts.insert(0, CommandReceipt::browser(label, format!("{} devices + shell pm list packages -u", self.adb_path.display()), "Package identifiers are held only in this app session.", true));
            }
            Err(error) => {
                self.status = error.to_string();
                self.receipts.insert(0, CommandReceipt::browser("Device inspection stopped", format!("{} devices", self.adb_path.display()), error.to_string(), false));
            }
        }
    }

    fn refresh_catalog(&mut self) {
        self.status = "Requesting the public package list; no device inventory is sent.".to_owned();
        match catalog::fetch() {
            Ok(entries) => {
                let count = entries.len();
                self.catalog = entries;
                self.status = format!("Loaded {count} community definitions locally.");
                self.receipts.insert(0, CommandReceipt::browser("Community definitions refreshed", format!("GET {}", catalog::UAD_LIST_URL), format!("{count} definitions loaded. No package inventory was uploaded."), true));
            }
            Err(error) => {
                self.status = error.to_string();
                self.receipts.insert(0, CommandReceipt::browser("Community refresh failed", format!("GET {}", catalog::UAD_LIST_URL), error.to_string(), false));
            }
        }
    }

    fn toggle_selected(&mut self, id: &str, on: bool) {
        if on && !self.selected.iter().any(|item| item == id) { self.selected.push(id.to_owned()); }
        if !on { self.selected.retain(|item| item != id); }
    }

    fn apply_selected(&mut self) {
        let Some(serial) = self.device.as_ref().map(|device| device.serial.clone()) else { self.status = "Connect a device first.".to_owned(); return; };
        let selected = std::mem::take(&mut self.selected);
        for id in selected {
            let (label, arguments, restore) = if self.remove_mode {
                (format!("Removed {id} for User 0"), vec!["shell", "pm", "uninstall", "-k", "--user", "0", &id], format!("adb -s {serial} shell cmd package install-existing --user 0 {id}"))
            } else {
                (format!("Disabled {id} for User 0"), vec!["shell", "pm", "disable-user", "--user", "0", &id], format!("adb -s {serial} shell pm enable {id}"))
            };
            self.receipt(label, adb::run(&self.adb_path, Some(&serial), &arguments), Some(restore));
        }
        self.status = "Queued package changes completed. Read the receipt output before continuing.".to_owned();
    }

    fn restore(&mut self, id: &str) {
        let Some(device) = &self.device else { return; };
        self.receipt(format!("Attempted restore for {id}"), adb::run(&self.adb_path, Some(&device.serial), &["shell", "cmd", "package", "install-existing", "--user", "0", id]), None);
    }

    fn privacy_check(&mut self, label: &str, args: &[&str]) {
        let Some(device) = &self.device else { self.status = "Connect a device first.".to_owned(); return; };
        self.receipt(label, adb::run(&self.adb_path, Some(&device.serial), args), None);
    }
}

impl eframe::App for App {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        let mut visuals = egui::Visuals::light();
        visuals.panel_fill = PAPER;
        visuals.window_fill = Color32::from_rgb(255, 253, 248);
        visuals.widgets.noninteractive.bg_fill = PAPER;
        visuals.selection.bg_fill = LIME;
        ctx.set_visuals(visuals);

        egui::TopBottomPanel::top("header").frame(egui::Frame::none().fill(INK).inner_margin(egui::Margin::symmetric(18.0, 14.0))).show(ctx, |ui| {
            ui.horizontal(|ui| {
                ui.label(RichText::new("ACC / 01").monospace().color(LIME).size(11.0));
                ui.separator();
                ui.label(RichText::new("ANDROID CONTROL CENTER").strong().color(PAPER));
                ui.add_space(10.0);
                let stamp = if self.device.is_some() { "USB DEBUGGING AUTHORIZED" } else { "AWAITING DEVICE" };
                ui.label(RichText::new(stamp).monospace().color(if self.device.is_some() { LIME } else { Color32::from_rgb(182, 197, 208) }).size(10.0));
                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| { ui.label(RichText::new("LOCAL-FIRST · NO TELEMETRY").monospace().color(Color32::from_rgb(182, 197, 208)).size(10.0)); });
            });
        });

        egui::SidePanel::left("navigation").exact_width(195.0).frame(egui::Frame::none().fill(INK).inner_margin(egui::Margin::same(12.0))).show(ctx, |ui| {
            ui.add_space(8.0);
            for (page, label) in [(Page::Desk, "01  DEVICE DESK"), (Page::Debloat, "02  DEBLOAT"), (Page::Privacy, "03  PRIVACY"), (Page::Profiles, "04  WORK PROFILES"), (Page::Updates, "05  UPDATES") ] {
                let selected = self.page == page;
                if ui.selectable_label(selected, RichText::new(label).monospace().color(if selected { INK } else { Color32::from_rgb(211, 221, 229) })).clicked() { self.page = page; }
                if selected { ui.painter().rect_filled(ui.min_rect(), 0.0, LIME); }
                ui.add_space(3.0);
            }
            ui.with_layout(egui::Layout::bottom_up(egui::Align::LEFT), |ui| {
                ui.label(RichText::new("Every device action is listed in the ledger.").size(11.0).color(Color32::from_rgb(145, 164, 179)));
                ui.label(RichText::new("TRANSPORT").monospace().size(10.0).color(LIME));
            });
        });

        egui::SidePanel::right("ledger").exact_width(330.0).frame(egui::Frame::none().fill(INK).inner_margin(egui::Margin::same(14.0))).show(ctx, |ui| {
            ui.label(RichText::new("COMMAND LEDGER").monospace().color(LIME).size(11.0));
            ui.label(RichText::new("Nothing happens off record.").strong().color(PAPER).size(17.0));
            ui.add_space(8.0);
            ui.label(RichText::new("Local receipts preserve the executable command, output, and a restoration attempt where appropriate.").size(11.0).color(Color32::from_rgb(190, 205, 216)));
            ui.separator();
            egui::ScrollArea::vertical().show(ui, |ui| {
                for receipt in &self.receipts {
                    egui::Frame::none().fill(Color32::from_rgb(27, 48, 72)).stroke(Stroke::new(1.0_f32, Color32::from_rgb(47, 72, 96))).inner_margin(egui::Margin::same(10.0)).show(ui, |ui| {
                        ui.label(RichText::new(&receipt.label).strong().color(PAPER).size(12.0));
                        ui.label(RichText::new(&receipt.command).monospace().color(Color32::from_rgb(210, 224, 234)).size(10.0));
                        if !receipt.output.is_empty() { ui.label(RichText::new(&receipt.output).monospace().color(if receipt.success { Color32::from_rgb(183, 203, 216) } else { Color32::from_rgb(246, 180, 162) }).size(10.0)); }
                        if let Some(restore) = &receipt.restore { ui.label(RichText::new(format!("restore → {restore}")).monospace().color(LIME).size(9.0)); }
                    });
                    ui.add_space(7.0);
                }
            });
        });

        egui::CentralPanel::default().frame(egui::Frame::none().fill(PAPER).inner_margin(egui::Margin::symmetric(24.0, 20.0))).show(ctx, |ui| {
            ui.label(RichText::new(match self.page { Page::Desk => "SERVICE BENCH / READY", Page::Debloat => "PACKAGE WORKSTATION", Page::Privacy => "PRIVACY REVIEW", Page::Profiles => "PROFILE INSPECTOR", Page::Updates => "MAINTENANCE" }).monospace().color(MUTED).size(11.0));
            ui.add_space(3.0);
            match self.page {
                Page::Desk => desk(ui, self),
                Page::Debloat => debloat(ui, self),
                Page::Privacy => privacy(ui, self),
                Page::Profiles => profiles(ui, self),
                Page::Updates => updates(ui, self),
            }
            ui.add_space(12.0);
            ui.separator();
            ui.label(RichText::new(&self.status).size(11.0).color(MUTED));
        });
    }
}

fn card(ui: &mut egui::Ui, content: impl FnOnce(&mut egui::Ui)) { egui::Frame::none().fill(Color32::from_rgb(255, 253, 248)).stroke(Stroke::new(1.0_f32, Color32::from_rgb(216, 209, 196))).inner_margin(egui::Margin::same(16.0)).show(ui, content); }

fn desk(ui: &mut egui::Ui, app: &mut App) {
    ui.heading(RichText::new("Inspect first. Change only what you can explain.").color(INK).size(29.0));
    ui.label(RichText::new("The native companion calls your local adb executable; it does not require a hosted service or transmit device data.").size(13.0).color(MUTED));
    ui.add_space(17.0);
    card(ui, |ui| { ui.horizontal(|ui| { ui.label("Local ADB path"); ui.text_edit_singleline(&mut app.adb_path.to_string_lossy().to_string()); if ui.button("Inspect connected device").clicked() { app.inspect_device(); } }); });
    ui.add_space(12.0);
    if let Some(device) = &app.device {
        ui.columns(3, |columns| {
            columns[0].label(RichText::new("DEVICE").monospace().color(MUTED).size(10.0)); columns[0].label(RichText::new(format!("{} {}", device.manufacturer, device.model)).strong());
            columns[1].label(RichText::new("ANDROID").monospace().color(MUTED).size(10.0)); columns[1].label(format!("{} · API {}", device.android, device.sdk));
            columns[2].label(RichText::new("INVENTORY").monospace().color(MUTED).size(10.0)); columns[2].label(format!("{} package IDs", app.packages.len()));
        });
    } else { ui.label(RichText::new("No authorized Android device is in this session.").color(MUTED)); }
}

fn debloat(ui: &mut egui::Ui, app: &mut App) {
    ui.heading(RichText::new("Beginner-safe debloating with evidence.").color(INK).size(27.0));
    ui.label(RichText::new("The GitHub list is requested only when you refresh it. Its classification is guidance, not a warranty.").size(13.0).color(MUTED));
    ui.horizontal(|ui| { if ui.button("Refresh community list").clicked() { app.refresh_catalog(); } ui.checkbox(&mut app.recommended_only, "Recommended only"); ui.checkbox(&mut app.remove_mode, "Advanced: remove for User 0"); });
    if app.remove_mode { ui.colored_label(Color32::from_rgb(147, 70, 57), "Advanced removal is less reversible than disablement. Review the ledger and restore path after every action."); }
    ui.add_space(8.0);
    ui.horizontal(|ui| { ui.label("Filter"); ui.text_edit_singleline(&mut app.query); ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| { if ui.add_enabled(!app.selected.is_empty() && app.device.is_some(), egui::Button::new(format!("Apply {} reviewed change(s)", app.selected.len()))).clicked() { app.apply_selected(); } }); });
    let matches: Vec<String> = app.packages.iter().filter(|id| app.catalog.contains_key(*id)).cloned().collect();
    if app.catalog.is_empty() { ui.add_space(30.0); ui.label(RichText::new("Refresh the community list to add package context to this local inventory.").color(MUTED)); return; }
    egui::ScrollArea::vertical().max_height(520.0).show(ui, |ui| {
        for id in matches {
            let Some(definition) = app.catalog.get(&id).cloned() else { continue; };
            if app.recommended_only && definition.removal != "Recommended" { continue; }
            if !app.query.is_empty() && !format!("{} {} {}", id, definition.list, definition.description).to_lowercase().contains(&app.query.to_lowercase()) { continue; }
            card(ui, |ui| { ui.horizontal(|ui| { let mut checked = app.selected.contains(&id); if ui.checkbox(&mut checked, "").changed() { app.toggle_selected(&id, checked); } ui.vertical(|ui| { ui.label(RichText::new(&id).monospace().strong().size(12.0)); ui.label(RichText::new(format!("{} · {}", definition.list, definition.removal)).size(11.0).color(MUTED)); }); ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| { if ui.button("Restore").clicked() { app.restore(&id); } }); }); ui.label(RichText::new(definition.description).size(11.0).color(MUTED)); if !definition.dependencies.is_empty() { ui.label(RichText::new(format!("Dependencies: {}", definition.dependencies.join(", "))).monospace().size(10.0).color(Color32::from_rgb(147, 70, 57))); } if !definition.needed_by.is_empty() { ui.label(RichText::new(format!("Needed by: {}", definition.needed_by.join(", "))).monospace().size(10.0).color(Color32::from_rgb(147, 70, 57))); } if !definition.labels.is_empty() { ui.label(RichText::new(format!("Labels: {}", definition.labels.join(", "))).monospace().size(10.0).color(MUTED)); } }); ui.add_space(5.0);
        }
    });
}

fn privacy(ui: &mut egui::Ui, app: &mut App) {
    ui.heading(RichText::new("Inspect privacy state before changing it.").color(INK).size(27.0));
    ui.label(RichText::new("Settings vary by Android version and vendor policy. These safe starting actions only read state.").size(13.0).color(MUTED));
    ui.add_space(12.0);
    for (label, args, description) in [("Review location mode", vec!["shell", "settings", "get", "secure", "location_mode"], "Reads the device setting; does not change it."), ("Review private DNS", vec!["shell", "settings", "get", "global", "private_dns_mode"], "Reads the current global DNS mode."), ("Review ADB network port", vec!["shell", "getprop", "service.adb.tcp.port"], "Checks whether debugging is listening on a network port.")] {
        card(ui, |ui| { ui.horizontal(|ui| { ui.vertical(|ui| { ui.label(RichText::new(label).strong()); ui.label(RichText::new(description).size(11.0).color(MUTED)); ui.label(RichText::new(format!("adb {}", args.join(" "))).monospace().size(10.0).color(MUTED)); }); ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| { if ui.add_enabled(app.device.is_some(), egui::Button::new("Run read-only check")).clicked() { app.privacy_check(label, &args); } }); }); }); ui.add_space(7.0);
    }
}

fn profiles(ui: &mut egui::Ui, app: &mut App) {
    ui.heading(RichText::new("Work profiles are a management boundary, not a clone button.").color(INK).size(25.0));
    ui.label(RichText::new("The inspector identifies Android users and profiles. It does not claim that a generic ADB command can create or duplicate an app into every work profile.").size(13.0).color(MUTED));
    ui.add_space(14.0);
    if ui.add_enabled(app.device.is_some(), egui::Button::new("Inspect users and profiles (pm list users)")).clicked() { app.privacy_check("Read Android user and profile list", &["shell", "pm", "list", "users"]); }
    ui.add_space(12.0);
    card(ui, |ui| { ui.label(RichText::new("Android Enterprise Work Profile separates managed work data from personal data. Only continue with profile-specific installation after the phone reports an eligible managed user and policy authority.").size(12.0).color(MUTED)); ui.hyperlink_to("Read Android Work Profile guidance", "https://www.android.com/enterprise/work-profile/"); });
}

fn updates(ui: &mut egui::Ui, app: &mut App) {
    ui.heading(RichText::new("Explicit maintenance only.").color(INK).size(27.0));
    ui.label(RichText::new("The app never polls. Refreshing community metadata or checking a release endpoint is a deliberate GitHub request initiated here.").size(13.0).color(MUTED));
    ui.add_space(12.0);
    card(ui, |ui| { ui.label(RichText::new("Community package definitions").strong()); ui.label(RichText::new(catalog::UAD_LIST_URL).monospace().size(10.0).color(MUTED)); if ui.button("Refresh UAD-ng package list").clicked() { app.refresh_catalog(); } });
    ui.add_space(8.0);
    card(ui, |ui| { ui.label(RichText::new("Application update endpoint").strong()); ui.text_edit_singleline(&mut app.update_endpoint); ui.label(RichText::new("Before publishing your own release, replace the placeholder with your repository’s GitHub Releases endpoint. The client intentionally does not silently contact it.").size(11.0).color(MUTED)); if ui.button("Record configured update endpoint").clicked() { app.receipts.insert(0, CommandReceipt::browser("Update endpoint recorded", app.update_endpoint.clone(), "No request was made. Configure your release URL before enabling a published update workflow.", true)); } });
    ui.add_space(6.0);
    ui.hyperlink_to("Review UAD-ng upstream project", UAD_REPO);
}

fn main() -> eframe::Result<()> {
    let options = eframe::NativeOptions { viewport: egui::ViewportBuilder::default().with_inner_size([1280.0, 800.0]).with_min_inner_size([980.0, 640.0]), ..Default::default() };
    eframe::run_native("Android Control Center", options, Box::new(|_context| Box::<App>::default()))
}
