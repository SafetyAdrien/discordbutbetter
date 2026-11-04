use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent,
};
use tauri_plugin_opener::OpenerExt;

/// Les liens externes (http/https hors de l'app) s'ouvrent dans le navigateur
/// du systeme, jamais dans la fenetre de l'application.
fn is_external(url: &tauri::Url) -> bool {
    matches!(url.scheme(), "http" | "https")
        && !matches!(url.host_str(), Some("localhost") | Some("tauri.localhost") | Some("127.0.0.1"))
}

fn show_main(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

pub fn run() {
    tauri::Builder::default()
        // Une seule instance : relancer l'AppImage remet la fenetre au premier plan.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| show_main(app)))
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle().clone();

            // Fenetre principale ; navigation externe -> navigateur systeme.
            let nav_handle = handle.clone();
            let new_handle = handle.clone();
            WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                .title("Discord but Better")
                .inner_size(1280.0, 800.0)
                .min_inner_size(940.0, 500.0)
                .center()
                // Barre de titre dessinee par l'app (DesktopTitleBar).
                .decorations(false)
                .on_navigation(move |url| {
                    if is_external(url) {
                        let _ = nav_handle.opener().open_url(url.as_str(), None::<&str>);
                        return false;
                    }
                    true
                })
                // window.open / target=_blank : toujours dans le navigateur systeme.
                .on_new_window(move |url, _features| {
                    let _ = new_handle.opener().open_url(url.as_str(), None::<&str>);
                    tauri::webview::NewWindowResponse::Deny
                })
                .build()?;

            // Icone de zone de notification : ouvrir / quitter.
            let open = MenuItem::with_id(app, "open", "Ouvrir", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quitter", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &quit])?;
            let mut tray = TrayIconBuilder::with_id("main")
                .tooltip("Discord but Better")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => show_main(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main(tray.app_handle());
                    }
                });
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            tray.build(app)?;
            Ok(())
        })
        // Fermer la fenetre la masque dans la zone de notification (appels
        // vocaux et notifications continuent) ; "Quitter" ferme vraiment.
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("erreur au lancement de l'application");
}
