// Evite la fenetre de console sous Windows en release ; sans effet sous Linux.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    discord_but_better_lib::run()
}
