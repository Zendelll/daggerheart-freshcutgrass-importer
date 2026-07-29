/**
 * Creates Daggerheart actors from parsed statblock data
 */
export class DaggerheartActorCreator {
  constructor() {
    this.debugMode = game?.settings?.get('daggerheart-statblock-importer', 'debugMode') || false;
  }
  
  /**
   * Create a new Daggerheart actor from parsed statblock data
   * @param {Object} parsedData - The parsed statblock data
   * @returns {Actor} The created actor
   */
  async createActor(parsedData) {
    this._debug('Creating actor from parsed data', parsedData);
    
    // Validate system compatibility
    if (game.system.id !== 'daggerheart') {
      throw new Error('This module requires the Daggerheart system');
    }
    
    // Prepare actor data
    const actorData = this._buildActorData(parsedData);
    
    // Create the actor
    const actor = await Actor.create(actorData);
    
    // Create items from features and experiences
    const items = await this._createItems(parsedData, actor);
    if (items.length > 0) {
      await actor.createEmbeddedDocuments('Item', items);
    }
    
    this._debug('Actor created successfully', actor);
    return actor;
  }
  
  /**
   * Build the core actor data structure
   */
  _buildActorData(parsedData) {
    // Determine actor type
    const actorType = parsedData.type === 'environment' ? 'environment' : 'adversary';
    
    if (actorType === 'environment') {
      return this._buildEnvironmentData(parsedData);
    } else {
      return this._buildAdversaryData(parsedData);
    }
  }
  
  /**
   * Build environment actor data
   */
  _buildEnvironmentData(parsedData) {
    return {
      name: parsedData.name || 'Unknown Environment',
      type: 'environment',
      img: 'icons/svg/mystery-man.svg',
      system: {
        difficulty: parsedData.difficulty || 10,
        tier: parsedData.tier || 1,
        description: `<p>${parsedData.description || ''}</p>`,
        type: parsedData.subtype || 'traversal',
        notes: '',
        potentialAdversaries: {},
        impulses: ''
      }
    };
  }
  
  /**
   * Build adversary actor data
   */
  _buildAdversaryData(parsedData) {
    // Determine attack name and dice from attackInfo
    let attackName = "Attack";
    let attackDice = "d6";
    let attackBonus = parsedData.attack || 0;
    
    if (parsedData.attackInfo) {
      attackName = parsedData.attackInfo.name;
      // Extract dice size from dice string (e.g., "1d12" -> "d12")
      const diceMatch = parsedData.attackInfo.dice.match(/\d*d(\d+)/);
      if (diceMatch) {
        attackDice = `d${diceMatch[1]}`;
      }
    }
    
    const actorData = {
      name: parsedData.name,
      type: 'adversary',
      img: this._getDefaultImage(parsedData),
      system: {
        difficulty: parsedData.difficulty || 10,
        damageThresholds: {
          major: Math.max(8, Math.floor(parsedData.difficulty * 0.6)),
          severe: Math.max(15, Math.floor(parsedData.difficulty * 1.1))
        },
        resources: {
          hitPoints: {
            value: 0,
            max: this._calculateTotalHP(parsedData.hitPoints),
            isReversed: true
          },
          stress: {
            value: 0,
            max: parsedData.stress || 3,
            isReversed: true
          }
        },
        motivesAndTactics: parsedData.motivesAndTactics || '',
        resistance: {
          physical: false,
          immunity: false,
          reduction: 0
        },
        magical: {
          resistance: false,
          immunity: false,
          reduction: 0
        },
        type: parsedData.subtype || 'solo',
        notes: '',
        hordeHp: 1,
        experiences: this._parseExperiencesForSystemData(parsedData.experiences || []),
        bonuses: {
          roll: {
            attack: {
              bonus: attackBonus,
              dice: []
            },
            action: {
              bonus: 0,
              dice: []
            },
            reaction: {
              bonus: 0,
              dice: []
            }
          },
          damage: {
            physical: {
              bonus: 0,
              dice: []
            },
            magical: {
              bonus: 0,
              dice: []
            }
          }
        },
        tier: parsedData.tier || 1,
        description: parsedData.description || '',
        attack: {
          name: attackName,
          img: this._getDefaultAttackImage(parsedData),
          range: this._mapRange(parsedData.attackInfo?.range || "melee"),
          roll: {
            type: 'attack',
            bonus: attackBonus,
            diceRolling: {
              dice: attackDice,
              multiplier: 'prof',
              flatMultiplier: 1
            }
          },
          damage: {
            parts: parsedData.attackInfo ? [{
              value: {
                custom: {
                  enabled: true,
                  formula: `${parsedData.attackInfo.dice}+${parsedData.attackInfo.bonus}`
                },
                multiplier: "flat",
                flatMultiplier: 1,
                dice: parsedData.attackInfo.dice.replace(/\d+/, ''),
                bonus: parsedData.attackInfo.bonus
              },
              applyTo: "hitPoints",
              type: [parsedData.attackInfo.damageType === 'phy' ? 'physical' : parsedData.attackInfo.damageType === 'mag' ? 'magical' : parsedData.attackInfo.damageType],
              base: false,
              resultBased: false
            }] : [],
            includeBase: false
          }
        }
      },
      folder: null,
      sort: 0,
      ownership: {
        default: 0
      },
      flags: {},
      _stats: {
        systemId: 'daggerheart',
        systemVersion: game.system.version || '1.0.0'
      }
    };
    
    this._debug('Built actor data', actorData);
    return actorData;
  }
  
  /**
   * Parse experiences for system data format (embedded in actor data)
   */
  _parseExperiencesForSystemData(experiences) {
    const systemExperiences = {};
    
    for (const exp of experiences) {
      const id = foundry.utils.randomID();
      systemExperiences[id] = {
        name: exp.name,
        value: exp.value
      };
    }
    
    return systemExperiences;
  }

  /**
   * Calculate total HP from the HP breakdown
   */
  _calculateTotalHP(hitPoints) {
    if (!hitPoints) return 0;
    return hitPoints.total || 0;
  }
  
  /**
   * Map range text to Daggerheart system values
   */
  _mapRange(rangeText) {
    const range = rangeText.toLowerCase().trim();
    if (range.includes('very close')) return 'veryClose';
    if (range.includes('close')) return 'close';
    if (range.includes('far')) return 'far';
    if (range.includes('very far')) return 'veryFar';
    return 'melee'; // default
  }

  /**
   * Get default image based on creature type
   */
  _getDefaultImage(parsedData) {
    // Use the same default as the Daggerheart system
    return 'systems/daggerheart/assets/icons/documents/actors/dragon-head.svg';
  }

  _getDefaultAttackImage(parsedData) {
    // Use the same default as the Daggerheart system
    return 'icons/skills/melee/blood-slash-foam-red.webp';
  }
  
  /**
   * Create items from parsed data (features only, experiences are embedded in system data)
   */
  async _createItems(parsedData, actor) {
    const items = [];
    
    // Create feature items (experiences are handled in system data, not as separate items)
    for (const feature of parsedData.features || []) {
      const itemData = this._buildFeatureItem(feature);
      if (itemData) {
        items.push(itemData);
      }
    }
    
    this._debug('Created items', { count: items.length, items });
    return items;
  }
  
  /**
   * Build a feature item
   */
  _buildFeatureItem(feature) {
    if (!feature.name) return null;
    
    // Parse advanced action details from description
    const actionDetails = this._parseActionDetails(feature);
    
    // Use 'feature' as the item type - this is the correct type for Daggerheart system
    var image = "";
    switch (feature.type) {
      case "action":
        image = 'icons/creatures/abilities/mouth-teeth-rows-red.webp';
        break;
      case "passive":
        image = 'icons/skills/melee/shield-block-gray-yellow.webp';
        break;
      case "reaction":
        image = 'icons/skills/ranged/projectile-spiral-gray.webp';
        break;
    }
    const itemData = {
      name: feature.name,
      type: 'feature',
      img: image,
      system: {
        description: feature.description || '',
        featureForm: feature.type,
        resource: null,
        actions: this._createFeatureActions(feature, actionDetails),
        originItemType: null,
        originId: null,
        identifier: undefined
      },
      folder: null,
      sort: 0,
      ownership: {
        default: 0
      },
      flags: {},
      _stats: {
        systemId: 'daggerheart',
        systemVersion: game.system.version || '1.0.0'
      }
    };
    
    this._debug('Built feature item', itemData);
    return itemData;
  }
  
  /**
   * Create actions for features based on their type and description
   */
  _createFeatureActions(feature, actionDetails) {
    const actions = {};
    
    // For passive features, no actions needed
    if (feature.type === 'passive') {
      return actions;
    }
    
    // Determine if this feature should have an action
    const needsAction = this._needsAction(feature);
    
    if (needsAction) {
      const actionId = foundry.utils.randomID();
      
      // Determine action type based on feature analysis
      let actionType = 'attack';
      if (feature.type === 'reaction' && actionDetails.damageParts.length > 0) {
        actionType = 'damage';
      }
      
      actions[actionId] = {
        type: 'damage',
        _id: actionId,
        systemPath: "actions",
        description: feature.description || '',
        chatDisplay: true,
        actionType: 'generic',
        cost: this._formatCost(actionDetails.cost),
        uses: {
          value: null,
          max: "",
          recovery: null
        },
        damage: {
          parts: this._formatDamageParts(actionDetails.damageParts),
          includeBase: false
        },
        target: {
          type: "any",
          amount: null
        },
        effects: [],
        roll: this._formatRoll(actionType, actionDetails),
        save: {
          trait: actionDetails.saveTrait || null,
          difficulty: null,
          damageMod: "none"
        },
        name: this._getActionName(feature, actionType),
        img: 'icons/creatures/abilities/mouth-teeth-rows-red.webp',
        range: actionDetails.range || ""
      };
      
      // Add second action for Acid Bath (ground effect)
      if (feature.name.toLowerCase().includes('acid bath')) {
        const secondActionId = foundry.utils.randomID();
        actions[secondActionId] = {
          type: 'damage',
          _id: secondActionId,
          systemPath: "actions",
          description: "This splash covers the ground within Very Close range with blood, and all creatures other than the Burrower who move through it take 1d6 physical damage.",
          chatDisplay: true,
          actionType: 'generic',
          cost: [],
          uses: {
            value: null,
            max: "",
            recovery: null
          },
          damage: {
            parts: [{
              value: {
                custom: {
                  enabled: true,
                  formula: "1d6"
                },
                multiplier: "flat",
                flatMultiplier: 1,
                dice: "d6",
                bonus: null
              },
              applyTo: "hitPoints",
              type: ["physical"],
              base: false,
              resultBased: false,
              valueAlt: {
                multiplier: "prof",
                flatMultiplier: 1,
                dice: "d6",
                bonus: null,
                custom: {
                  enabled: false
                }
              }
            }],
            includeBase: false
          },
          target: {
            type: "any",
            amount: null
          },
          effects: [],
          name: "Acid Ground",
          img: 'icons/magic/acid/dissolve-pool-bubbles.webp',
          range: ""
        };
      }
    }
    
    return actions;
  }
  
  /**
   * Format cost array for Daggerheart system
   */
  _formatCost(costArray) {
    return costArray.map(cost => ({
      scalable: false,
      key: cost.key,
      value: cost.value,
      keyIsID: false,
      step: null
    }));
  }
  
  /**
   * Format damage parts for Daggerheart system
   */
  _formatDamageParts(damageParts) {
    return damageParts.map(part => {
      if (part.applyTo === 'armor') {
        // Special formatting for armor damage
        return {
          value: {
            custom: {
              enabled: true,
              formula: "1"
            },
            multiplier: "flat",
            flatMultiplier: 1,
            dice: "d6",
            bonus: null
          },
          applyTo: "armor",
          base: false,
          resultBased: false,
          valueAlt: {
            multiplier: "prof",
            flatMultiplier: 1,
            dice: "d6",
            bonus: null,
            custom: {
              enabled: false
            }
          },
          type: []
        };
      } else {
        // Regular damage formatting
        const formula = `${part.value.diceCount}d${part.value.diceSize}`;
        
        return {
          value: {
            custom: {
              enabled: true,
              formula: formula
            },
            multiplier: "flat",
            flatMultiplier: 1,
            dice: "d6",
            bonus: null
          },
          applyTo: part.applyTo || "hitPoints",
          type: part.type,
          base: false,
          resultBased: false,
          valueAlt: {
            multiplier: "prof",
            flatMultiplier: 1,
            dice: "d6",
            bonus: null,
            custom: {
              enabled: false
            }
          }
        };
      }
    });
  }
  
  /**
   * Format roll data for Daggerheart system
   */
  _formatRoll(actionType, actionDetails) {
    if (actionType === 'attack') {
      return {
        type: null,
        trait: null,
        difficulty: null,
        bonus: null,
        advState: "neutral",
        diceRolling: {
          multiplier: "prof",
          flatMultiplier: 1,
          dice: "d6",
          compare: null,
          treshold: null
        },
        useDefault: false
      };
    } else {
      return {
        type: null,
        trait: null,
        difficulty: null,
        bonus: null,
        advState: "neutral",
        diceRolling: {
          multiplier: "prof",
          flatMultiplier: 1,
          dice: "d6",
          compare: null,
          treshold: null
        },
        useDefault: false
      };
    }
  }
  
  /**
   * Get appropriate action name based on cost or action type
   */
  _getActionName(feature, actionType) {
    const description = (feature.description || '').toLowerCase();
    
    // Name based on cost first
    if ((description.includes('mark a stress') || description.includes('mark stress')) 
      && (description.includes('spend fear') || description.includes('mark fear'))) {
      return "Stress and Fear";
    } else if (description.includes('mark a stress') || description.includes('mark stress')) {
      return "Stress";
    } else if (description.includes('spend fear') || description.includes('mark fear')) {
      return "Fear";
    } else if (description.includes('spend hope') || description.includes('mark hope')) {
      return "Hope";
    } else if (description.includes('mark armor') || description.includes('armor slot')) {
      return "Armor";
    } else if (description.includes('mark hp') || description.includes('mark a hp')) {
      return "HP";
    }
    
    // Name based on action type if no cost
    if (feature.type === 'reaction') {
      return "Reaction";
    } else if (feature.type === 'passive') {
      return "Passive";
    } else if (feature.type === 'action') {
      return "Action";
    }
    
    // Default fallback
    return "Action";
  }
  
  /**
   * Determine if a feature needs an action
   */
  _needsAction(feature) {
    const description = (feature.description || '').toLowerCase();
    const name = (feature.name || '').toLowerCase();
    
    // Passive features don't need actions
    if (feature.type === 'passive') {
      return false;
    }
    
    // Action and Reaction features that have costs, attacks, damage, or special mechanics
    return description.includes('make an attack') || 
           description.includes('attack against') ||
           description.includes('damage') ||
           description.includes('heal') ||
           description.includes('summon') ||
           description.includes('spend') ||
           description.includes('mark') ||
           description.includes('reaction roll') ||
           name.includes('eruption') ||
           name.includes('spit') ||
           name.includes('bath') ||
           name.includes('blast') ||
           feature.type === 'action' ||
           feature.type === 'reaction';
  }
  
  /**
   * Parse action details from feature description
   */
  _parseActionDetails(feature) {
    const description = (feature.description || '').toLowerCase();
    const name = (feature.name || '').toLowerCase();
    const details = {
      cost: [],
      targetType: 'any',
      targetAmount: 1,
      saveTrait: null,
      saveDifficulty: null,
      range: 'melee',
      attackType: 'attack',
      damageParts: [],
      uses: null,
      recovery: null
    };
    
    // Parse all cost types using the correct 'key' structure - ORDER MATTERS!
    if (description.includes('spend a fear') || description.includes('spend fear')) {
      details.cost.push({ 
        key: 'fear', 
        value: 1, 
        keyIsID: false, 
        step: null, 
        scalable: false 
      });
    }
    if (description.includes('mark a stress') || description.includes('mark stress')) {
      details.cost.push({ 
        key: 'stress', 
        value: 1, 
        keyIsID: false, 
        step: null, 
        scalable: false 
      });
    }
    
    if (description.includes('mark hope') || description.includes('spend hope')) {
      details.cost.push({ 
        key: 'hope', 
        value: 1, 
        keyIsID: false, 
        step: null, 
        scalable: false 
      });
    }
    if (description.includes('mark an armor slot') || description.includes('mark armor')) {
      details.cost.push({ 
        key: 'armor', 
        value: 1, 
        keyIsID: false, 
        step: null, 
        scalable: false 
      });
    }
    if (description.includes('mark a hp') || description.includes('mark hp')) {
      details.cost.push({ 
        key: 'hitPoints', 
        value: 1, 
        keyIsID: false, 
        step: null, 
        scalable: false 
      });
    }
    
    // Parse uses and recovery
    const usesMatch = description.match(/(\d+)\s*(?:time|use)s?\s*per\s*(scene|session|short\s*rest|long\s*rest)/i);
    if (usesMatch) {
      details.uses = parseInt(usesMatch[1]);
      const recoveryText = usesMatch[2].toLowerCase().replace(/\s+/g, '');
      if (recoveryText.includes('scene')) details.recovery = 'scene';
      else if (recoveryText.includes('session')) details.recovery = 'session';
      else if (recoveryText.includes('shortrest')) details.recovery = 'shortrest';
      else if (recoveryText.includes('longrest')) details.recovery = 'longrest';
    }
    
    // Parse all reaction roll types (save requirements)
    if (description.includes('agility reaction roll') || description.includes('agility save')) {
      details.saveTrait = 'agility';
    } else if (description.includes('strength reaction roll') || description.includes('strength save')) {
      details.saveTrait = 'strength';
    } else if (description.includes('finesse reaction roll') || description.includes('finesse save')) {
      details.saveTrait = 'finesse';
    } else if (description.includes('instinct reaction roll') || description.includes('instinct save')) {
      details.saveTrait = 'instinct';
    } else if (description.includes('presence reaction roll') || description.includes('presence save')) {
      details.saveTrait = 'presence';
    } else if (description.includes('knowledge reaction roll') || description.includes('knowledge save')) {
      details.saveTrait = 'knowledge';
    }
    
    // Parse all range types - prioritize specific mentions
    if (description.includes('self') || name.includes('self')) {
      details.range = 'self';
    } else if (description.includes('melee') || name.includes('melee')) {
      details.range = 'melee';
    } else if (name.includes('bath')) {
      details.range = 'close'; // Acid Bath uses close range
    } else if (description.includes('within very close range')) {
      details.range = 'veryClose';
    } else if (description.includes('within close range') || name.includes('spit')) {
      details.range = 'close';
    } else if (description.includes('within far range')) {
      details.range = 'far';
    } else if (description.includes('within very far range')) {
      details.range = 'veryFar';
    }
    
    // Parse target information
    if (description.includes('all creatures') || description.includes('all targets')) {
      details.targetType = 'any';
      details.targetAmount = null;
    }
    
    // Parse damage information with enhanced patterns
    const damagePattern = /(\d+)d(\d+)(?:\s*[+-]\s*(\d+))?\s+(physical|magical|phy|mag)/gi;
    let match;
    while ((match = damagePattern.exec(description)) !== null) {
      const diceCount = parseInt(match[1]);
      const diceSize = parseInt(match[2]);
      const bonus = match[3] ? parseInt(match[3]) : 0;
      const damageType = match[4].toLowerCase();
      
      details.damageParts.push({
        applyTo: 'hitPoints',
        resultBased: false,
        value: {
          diceCount: diceCount,
          diceSize: diceSize,
          bonus: bonus
        },
        type: [damageType.startsWith('phy') ? 'physical' : 'magical']
      });
    }
    
    // Special handling for armor slot targeting (Spit Acid)
    if (description.includes('armor slot')) {
      // For Spit Acid, both damage parts should target armor
      // The system will automatically handle the "if no armor, hit HP" logic
      details.damageParts.forEach(part => {
        if (part.applyTo === 'hitPoints') {
          part.applyTo = 'armor';
        }
      });
      
      // If no damage parts were found, add a default armor damage
      if (details.damageParts.length === 0) {
        details.damageParts.push({
          applyTo: 'armor',
          resultBased: false,
          value: {
            diceCount: 0,
            diceSize: 6,
            bonus: 1
          },
          type: []
        });
      }
    }
    
    // Determine attack type based on feature type and description
    if (description.includes('heal') || name.includes('heal')) {
      details.attackType = 'healing';
    } else if (description.includes('summon') || name.includes('summon')) {
      details.attackType = 'summon';
    } else if (feature.type === 'reaction' && description.includes('damage')) {
      details.attackType = 'damage'; // Reactions that deal damage
    } else if (description.includes('make an attack') || description.includes('attack against') || 
               description.includes('damage') || name.includes('eruption') || 
               name.includes('spit') || name.includes('bath') || name.includes('blast')) {
      details.attackType = 'attack'; // Most common case
    } else {
      details.attackType = ''; // Leave blank if no clear indicators
    }
    
    // Special case for Earth Eruption - it's an attack but with special mechanics
    if (name.includes('eruption')) {
      details.attackType = 'attack';
      // Earth Eruption doesn't deal direct damage, it knocks prone
      details.damageParts = []; // Clear any parsed damage
    }
    
    this._debug('Parsed action details', details);
    return details;
  }
  
  /**
   * Debug logging helper
   */
  _debug(message, data = null) {
    if (this.debugMode) {
      console.log(`DaggerheartActorCreator | ${message}`, data);
    }
  }
}