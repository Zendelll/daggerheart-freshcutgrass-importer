import { DaggerheartActorCreator } from './actor-creator.js';
import { StatblockFetcher } from './fetch-advesary.js';

// Get both the base class and the Handlebars mixin
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * AppV2 Dialog for importing Daggerheart statblocks
 * Wrap ApplicationV2 in the HandlebarsApplicationMixin
 */
export class ImportDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  
  static DEFAULT_OPTIONS = {
    id: "daggerheart-statblock-importer-dialog",
    classes: ["daggerheart-statblock-importer", "dialog"],
    window: {
      title: "daggerheart-statblock-importer.dialog.title",
      resizable: true
    },
    position: {
      width: 600,
      height: 500
    },
    actions: {
      import: ImportDialog._onImportAction
    }
  };

  // Define the parts of the application (the template file)
  static PARTS = {
    form: {
      template: "modules/daggerheart-freshcutgrass-importer/templates/import-dialog.hbs" 
    }
  };

  // Focus on textarea after rendering
  _onRender(context, options) {
    super._onRender(context, options);
    this.element.querySelector('.statblock-input')?.focus();
  }

  // Action Handler
  static async _onImportAction(event, target) {
    const textarea = this.element.querySelector(".statblock-input");
    const statblockLink = textarea.value.trim();
    
    if (!statblockLink) {
      ui.notifications.warn(game.i18n.localize("daggerheart-statblock-importer.notifications.empty"));
      return;
    }
    
    const originalText = target.innerHTML;
    target.disabled = true;
    target.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${game.i18n.localize("daggerheart-statblock-importer.notifications.parsing")}`;
    
    try {
      console.log("Daggerheart Statblock Importer | Starting statblock import", { text: statblockLink });

      const fetcher = new StatblockFetcher();
      const fetchedData = await fetcher.fetch(statblockLink)
      
      target.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${game.i18n.localize("daggerheart-statblock-importer.notifications.creating")}`;
      
      const actorCreator = new DaggerheartActorCreator();
      const actor = await actorCreator.createActor(fetchedData);
      
      ui.notifications.info(
        game.i18n.format("daggerheart-statblock-importer.notifications.success", { name: actor.name })
      );
      
      this.close();
      actor.sheet.render(true);
      
    } catch (error) {
      console.error("Daggerheart Statblock Importer | Import failed", error);
      ui.notifications.error(
        game.i18n.format("daggerheart-statblock-importer.notifications.error", { error: error.message })
      );
    } finally {
      if (this.rendered) {
        target.disabled = false;
        target.innerHTML = originalText;
      }
    }
  }
}