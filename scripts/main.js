import { DaggerheartActorCreator } from './actor-creator.js';
import { ImportDialog } from './import-dialog.js';

/**
 * Main module initialization
 */
Hooks.once("init", () => {
  console.log("Daggerheart Statblock Importer | Initializing module");
  
  // Register module settings if needed
  game.settings.register("daggerheart-statblock-importer", "debugMode", {
    name: "Debug Mode",
    hint: "Enable debug logging for the statblock importer",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });
});
/**
 * Add import button to actors directory
 */
Hooks.on('renderActorDirectory', (app, html, data) => {
  // Only show for Daggerheart system
  if (game.system.id !== 'daggerheart') return;
  
  // Find the header actions container using standard DOM query
  const header = html.querySelector(".header-actions");
  
  if (header) {
    // Create the button natively
    const importButton = document.createElement("button");
    importButton.className = "daggerheart-import-button";
    importButton.title = game.i18n.localize('daggerheart-statblock-importer.title');
    
    // Add the icon and text
    importButton.innerHTML = `
      <i class="fas fa-file-import"></i>
      ${game.i18n.localize('daggerheart-statblock-importer.button.import')}
    `;
    
    // Attach the click event listener
    importButton.addEventListener('click', () => {
      new ImportDialog().render(true);
    });
    
    // Append it to the very end of the header actions
    header.appendChild(importButton);
  }
});

/**
 * Debug logging utility
 */
window.DaggerheartStatblockImporter = {
  debug: (message, ...args) => {
    if (game.settings.get('daggerheart-statblock-importer', 'debugMode')) {
      console.log(`Daggerheart Statblock Importer | ${message}`, ...args);
    }
  },
  
  error: (message, ...args) => {
    console.error(`Daggerheart Statblock Importer | ${message}`, ...args);
  },
  
  // Expose classes for debugging
  DaggerheartActorCreator,
  ImportDialog
};

