use std::path::PathBuf;
use std::sync::Mutex;

use serde::Deserialize;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{TrayIconBuilder, TrayIconEvent, MouseButton, MouseButtonState},
    webview::WebviewWindowBuilder,
    Manager, WebviewUrl,
};
#[cfg(target_os = "macos")]
use tauri::menu::{PredefinedMenuItem, SubmenuBuilder};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_global_shortcut::GlobalShortcutExt;
use tauri_plugin_notification::NotificationExt;

const CALBLEND_INJECT: &str = include_str!("../../dist/calblend-inject.js");
const CALENDAR_URL: &str = "https://calendar.google.com/calendar/r";
const LOGIN_URL: &str =
    "https://accounts.google.com/ServiceLogin?service=cl&continue=https://calendar.google.com/calendar/r";

// ── Upcoming events state ───────────────────────────────────────────────

#[derive(Debug, Clone, Deserialize, serde::Serialize)]
pub struct UpcomingEvent {
    pub title: String,
    pub time: String,
    pub minutes_until: i32,
    pub event_id: String,
}

struct AppState {
    upcoming_events: Mutex<Vec<UpcomingEvent>>,
}

// ── Tauri commands ──────────────────────────────────────────────────────

#[tauri::command]
fn show_event_notification(
    app: tauri::AppHandle,
    title: String,
    body: String,
    event_id: Option<String>,
) {
    let mut builder = app.notification().builder();
    builder = builder
        .title(&title)
        .body(&body)
        .sound("default")
        .auto_cancel();

    if let Some(id) = event_id {
        builder = builder.extra("event_id", id);
    }

    if let Err(e) = builder.show() {
        eprintln!("[CalBlend] Notification error: {e}");
    }
}

#[tauri::command]
fn update_upcoming_events(app: tauri::AppHandle, events: Vec<UpcomingEvent>) {
    if let Some(state) = app.try_state::<AppState>() {
        if let Ok(mut stored) = state.upcoming_events.lock() {
            *stored = events.clone();
        }
    }

    // Update tray menu, title, and tooltip
    if let Err(e) = rebuild_tray_menu(&app, &events) {
        eprintln!("[CalBlend] Failed to rebuild tray menu: {e}");
    }
    update_tray_title(&app, &events);
    update_tray_tooltip(&app, &events);
    update_dock_badge(&app, &events);
}

// ── Tray helpers ────────────────────────────────────────────────────────

fn rebuild_tray_menu(
    app: &tauri::AppHandle,
    events: &[UpcomingEvent],
) -> Result<(), Box<dyn std::error::Error>> {
    let mut menu_builder = MenuBuilder::new(app);

    if events.is_empty() {
        let no_events = MenuItemBuilder::with_id("no_events", "No upcoming events")
            .enabled(false)
            .build(app)?;
        menu_builder = menu_builder.item(&no_events);
    } else {
        let header = MenuItemBuilder::with_id("events_header", "Upcoming")
            .enabled(false)
            .build(app)?;
        menu_builder = menu_builder.item(&header);

        for (i, event) in events.iter().take(5).enumerate() {
            let label = format_event_label(event);
            let id = format!("event_{i}");
            let item = MenuItemBuilder::with_id(id, &label).build(app)?;
            menu_builder = menu_builder.item(&item);
        }
    }

    menu_builder = menu_builder.separator();

    let open_item = MenuItemBuilder::with_id("open", "Open CalBlend").build(app)?;
    let about_item = MenuItemBuilder::with_id("about", "About CalBlend").build(app)?;
    let settings_item = MenuItemBuilder::with_id("settings", "Settings").build(app)?;
    let reload_item = MenuItemBuilder::with_id("reload", "Reload Calendar").build(app)?;
    let quit_item = MenuItemBuilder::with_id("quit", "Quit CalBlend").build(app)?;

    let menu = menu_builder
        .item(&open_item)
        .separator()
        .item(&about_item)
        .item(&settings_item)
        .item(&reload_item)
        .separator()
        .item(&quit_item)
        .build()?;

    if let Some(tray) = app.tray_by_id("calblend_tray") {
        tray.set_menu(Some(menu))?;
    }

    Ok(())
}

/// Show the next upcoming event title in the menu bar (Dato/Meeter style).
fn update_tray_title(app: &tauri::AppHandle, events: &[UpcomingEvent]) {
    let Some(tray) = app.tray_by_id("calblend_tray") else {
        return;
    };

    // Find next event that hasn't started yet (or just started)
    let next = events.iter().find(|e| e.minutes_until >= 0);
    let title = match next {
        Some(ev) => {
            // Truncate title to keep menu bar compact
            let name = if ev.title.len() > 20 {
                format!("{}…", &ev.title[..ev.title.floor_char_boundary(18)])
            } else {
                ev.title.clone()
            };
            format!("{} {}", ev.time, name)
        }
        None => String::new(),
    };

    let _ = tray.set_title(Some(&title));
}

/// Set tray tooltip with the next 3 events (shown on hover).
fn update_tray_tooltip(app: &tauri::AppHandle, events: &[UpcomingEvent]) {
    let Some(tray) = app.tray_by_id("calblend_tray") else {
        return;
    };

    let upcoming: Vec<&UpcomingEvent> = events.iter().filter(|e| e.minutes_until >= -5).take(3).collect();

    let tooltip = if upcoming.is_empty() {
        "CalBlend — No upcoming events".to_string()
    } else {
        let lines: Vec<String> = upcoming
            .iter()
            .map(|e| format!("{} {}", e.time, e.title))
            .collect();
        format!("CalBlend\n{}", lines.join("\n"))
    };

    let _ = tray.set_tooltip(Some(&tooltip));
}

/// Show count of events in the next 2h as dock badge (macOS).
fn update_dock_badge(app: &tauri::AppHandle, events: &[UpcomingEvent]) {
    let count = events
        .iter()
        .filter(|e| e.minutes_until >= 0 && e.minutes_until <= 120)
        .count();

    #[cfg(target_os = "macos")]
    if let Some(w) = app.get_webview_window("main") {
        let label = if count > 0 {
            Some(count.to_string())
        } else {
            None
        };
        let _ = w.set_badge_label(label);
    }

    #[cfg(not(target_os = "macos"))]
    if let Some(w) = app.get_webview_window("main") {
        let c = if count > 0 { Some(count as i64) } else { None };
        let _ = w.set_badge_count(c);
    }
}

fn format_event_label(event: &UpcomingEvent) -> String {
    let time_info = if event.minutes_until < 0 {
        "now".to_string()
    } else if event.minutes_until == 0 {
        "starting".to_string()
    } else if event.minutes_until < 60 {
        format!("in {} min", event.minutes_until)
    } else {
        let hours = event.minutes_until / 60;
        let mins = event.minutes_until % 60;
        if mins == 0 {
            format!("in {hours}h")
        } else {
            format!("in {hours}h{mins}m")
        }
    };

    let title = if event.title.len() > 30 {
        format!("{}…", &event.title[..28])
    } else {
        event.title.clone()
    };

    format!("{} {} · {}", event.time, title, time_info)
}

// ── Window helpers ──────────────────────────────────────────────────────

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

fn toggle_main_window(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        if w.is_visible().unwrap_or(false) {
            let _ = w.hide();
        } else {
            let _ = w.show();
            let _ = w.unminimize();
            let _ = w.set_focus();
        }
    }
}

fn open_about_window(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("about") {
        let _ = w.set_focus();
        return;
    }
    let _ = WebviewWindowBuilder::new(app, "about", WebviewUrl::App("about.html".into()))
        .title("About CalBlend")
        .inner_size(400.0, 540.0)
        .resizable(false)
        .maximizable(false)
        .minimizable(false)
        .build();
}

fn open_settings_window(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("settings") {
        let _ = w.set_focus();
        return;
    }
    let _ = WebviewWindowBuilder::new(app, "settings", WebviewUrl::App("settings.html".into()))
        .title("CalBlend Settings")
        .inner_size(380.0, 620.0)
        .resizable(false)
        .build();
}

fn reload_calendar(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let url: tauri::Url = CALENDAR_URL.parse().unwrap();
        let _ = w.navigate(url);
    }
}

fn click_event_in_calendar(app: &tauri::AppHandle, event_id: &str) {
    if let Some(w) = app.get_webview_window("main") {
        let escaped = event_id.replace('\\', r"\\").replace('"', r#"\""#);
        let js = format!(
            r#"(function(){{
                var el = document.querySelector('[data-eventid="{escaped}"]');
                if (el) el.click();
                else {{
                    var inner = document.querySelector('[data-eventid="{escaped}"] [role="button"]');
                    if (inner) inner.click();
                }}
            }})()"#,
        );
        let _ = w.eval(&js);
    }
}

// ── Main ────────────────────────────────────────────────────────────────

pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(AppState {
            upcoming_events: Mutex::new(Vec::new()),
        });

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
        show_main_window(app);
    }));

    builder
        .invoke_handler(tauri::generate_handler![
            show_event_notification,
            update_upcoming_events,
        ])
        .setup(|app| {
            let _ = app.notification().request_permission();

            // Enable autostart by default on first run
            {
                use tauri_plugin_autostart::ManagerExt;
                let autostart = app.autolaunch();
                if !autostart.is_enabled().unwrap_or(false) {
                    let _ = autostart.enable();
                }
            }

            // Global shortcut: Cmd+Shift+C → toggle window
            let app_handle = app.handle().clone();
            app.global_shortcut().on_shortcut("CmdOrCtrl+Shift+C", move |_app, _shortcut, event| {
                if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                    toggle_main_window(&app_handle);
                }
            })?;

            // Persist WebView session data
            let data_dir: PathBuf = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir")
                .join("webview");

            // Check if launched with --hidden flag (autostart)
            let start_hidden = std::env::args().any(|a| a == "--hidden");

            // Main window
            let main_window = WebviewWindowBuilder::new(
                app,
                "main",
                WebviewUrl::External(LOGIN_URL.parse().unwrap()),
            )
            .title("CalBlend")
            .inner_size(1280.0, 900.0)
            .min_inner_size(800.0, 600.0)
            .data_directory(data_dir)
            .initialization_script(CALBLEND_INJECT)
            .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
            .visible(!start_hidden)
            .build()?;

            // Close → hide
            let main_handle = main_window.clone();
            main_window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = main_handle.hide();
                }
            });

            if !start_hidden {
                main_window.set_focus()?;
            }

            // ── macOS menu bar ──────────────────────────────────────
            #[cfg(target_os = "macos")]
            {
                let about_item = MenuItemBuilder::with_id("menubar_about", "About CalBlend")
                    .build(app)?;
                let settings_item = MenuItemBuilder::with_id("menubar_settings", "Settings…")
                    .accelerator("CmdOrCtrl+,")
                    .build(app)?;

                let app_menu = SubmenuBuilder::new(app, "CalBlend")
                    .item(&about_item)
                    .separator()
                    .item(&settings_item)
                    .separator()
                    .item(&PredefinedMenuItem::hide(app, None)?)
                    .item(&PredefinedMenuItem::hide_others(app, None)?)
                    .item(&PredefinedMenuItem::show_all(app, None)?)
                    .separator()
                    .item(&PredefinedMenuItem::quit(app, None)?)
                    .build()?;

                let reload_item = MenuItemBuilder::with_id("menubar_reload", "Reload Calendar")
                    .accelerator("CmdOrCtrl+R")
                    .build(app)?;

                let edit_menu = SubmenuBuilder::new(app, "Edit")
                    .undo()
                    .redo()
                    .separator()
                    .cut()
                    .copy()
                    .paste()
                    .select_all()
                    .build()?;

                let view_menu = SubmenuBuilder::new(app, "View")
                    .item(&reload_item)
                    .separator()
                    .fullscreen()
                    .build()?;

                let window_menu = SubmenuBuilder::new(app, "Window")
                    .minimize()
                    .maximize()
                    .close_window()
                    .separator()
                    .build()?;

                let menu_bar = MenuBuilder::new(app)
                    .item(&app_menu)
                    .item(&edit_menu)
                    .item(&view_menu)
                    .item(&window_menu)
                    .build()?;

                app.set_menu(menu_bar)?;

                app.on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "menubar_about" => open_about_window(app),
                        "menubar_settings" => open_settings_window(app),
                        "menubar_reload" => reload_calendar(app),
                        _ => {}
                    }
                });
            }

            // ── System tray ─────────────────────────────────────────
            let no_events = MenuItemBuilder::with_id("no_events", "No upcoming events")
                .enabled(false)
                .build(app)?;
            let open_item = MenuItemBuilder::with_id("open", "Open CalBlend").build(app)?;
            let about_item = MenuItemBuilder::with_id("about", "About CalBlend").build(app)?;
            let settings_item = MenuItemBuilder::with_id("settings", "Settings").build(app)?;
            let reload_item = MenuItemBuilder::with_id("reload", "Reload Calendar").build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "Quit CalBlend").build(app)?;

            let menu = MenuBuilder::new(app)
                .item(&no_events)
                .separator()
                .item(&open_item)
                .separator()
                .item(&about_item)
                .item(&settings_item)
                .item(&reload_item)
                .separator()
                .item(&quit_item)
                .build()?;

            TrayIconBuilder::with_id("calblend_tray")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("CalBlend")
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        toggle_main_window(app);
                    }
                })
                .on_menu_event(move |app, event| {
                    let id = event.id().as_ref();

                    if id.starts_with("event_") {
                        if let Some(idx) = id.strip_prefix("event_").and_then(|s| s.parse::<usize>().ok()) {
                            show_main_window(app);
                            if let Some(state) = app.try_state::<AppState>() {
                                if let Ok(events) = state.upcoming_events.lock() {
                                    if let Some(ev) = events.get(idx) {
                                        click_event_in_calendar(app, &ev.event_id);
                                    }
                                }
                            }
                        }
                        return;
                    }

                    match id {
                        "open" => show_main_window(app),
                        "about" => open_about_window(app),
                        "settings" => open_settings_window(app),
                        "reload" => reload_calendar(app),
                        "quit" => app.exit(0),
                        _ => {}
                    }
                })
                .build(app)?;

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building CalBlend")
        .run(|_app_handle, _event| {
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen {
                has_visible_windows,
                ..
            } = _event
            {
                if !has_visible_windows {
                    show_main_window(_app_handle);
                }
            }
        });
}
