// app.js

import { initUI, switchPage } from './ui.js';

// Initialize the UI
initUI();

// Handle Navbar Navigation
document.getElementById('homeLink').addEventListener('click', () => switchPage('homePage'));
document.getElementById('settingsLink').addEventListener('click', () => switchPage('settingsPage'));

// Load saved settings on startup
window.addEventListener('load', () => {
    switchPage('homePage');
});
