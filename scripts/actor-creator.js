export class DaggerheartActorCreator {
  default_enviroment_image = "icons/svg/oak.svg"
  default_adversary_image = "systems/daggerheart/assets/icons/documents/actors/dragon-head.svg"
  default_physical_attack_image = "icons/skills/melee/blood-slash-foam-red.webp"
  default_magical_attack_image = "icons/magic/symbols/circled-gem-pink.webp"
  default_action_feature_image = "icons/creatures/abilities/mouth-teeth-rows-red.webp"
  default_passive_feature_image = "icons/skills/melee/shield-block-gray-yellow.webp"
  default_reaction_feature_image = "icons/skills/ranged/projectile-spiral-gray.webp"


  constructor() {
    this.debugMode = game?.settings?.get('daggerheart-statblock-importer', 'debugMode') || false;
  }

  async createActor(parsedData) {
    this._debug('Creating actor from parsed data', parsedData);
    
    const actorData = this._buildActorData(parsedData);
    const actor = await Actor.create(actorData);
    
    const items = await this._createItems(parsedData);
    if (items.length > 0) {
      await actor.createEmbeddedDocuments('Item', items);
    }
    
    this._debug('Actor created successfully', actor);
    return actor;
  }
  
  _buildActorData(parsedData) {
    const actorType = parsedData.type
    
    if (actorType === 'environment') {
      return this._buildEnvironmentData(parsedData);
    } else {
      return this._buildAdversaryData(parsedData);
    }
  }

  _buildEnvironmentData(parsedData) {
    return {
      name: parsedData.name || 'Unknown Environment',
      type: 'environment',
      img: this.default_enviroment_image,
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
  
  _buildAdversaryData(parsedData) {
    let [attackName, attackDice, attackBonus] = this._buildAttackData(parsedData)
    const experiences = this._buildExperiences(parsedData.experiences)
    const attackType = [parsedData.attackInfo.damageType === 'phy' ? 'physical' : 'magical']

    
    const actorData = {
      name: parsedData.name,
      type: 'adversary',
      img: this.default_adversary_image,
      system: {
        difficulty: parsedData.difficulty,
        damageThresholds: {
          major: parsedData.hitPoints.major,
          severe: parsedData.hitPoints.severe,
        },
        resources: {
          hitPoints: {
            value: 0,
            max: parsedData.hitPoints.total,
            isReversed: true
          },
          stress: {
            value: 0,
            max: parsedData.stress,
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
        hordeHp: parsedData.hordeHp,
        experiences: experiences,
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
        tier: parsedData.tier,
        description: parsedData.description,
        attack: {
          name: attackName,
          img: attackType[0] == "physical" ? this.default_physical_attack_image : this.default_magical_attack_image,
          range: this._mapRange(parsedData.attackInfo.range),
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
            parts: [{
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
              type: attackType,
              base: false,
              resultBased: false
            }],
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

  _buildAttackData(parsedData) {
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

    return [attackName, attackDice, attackBonus]
  }

  _buildExperiences(experiences) {
    const resultExperiences = {};
    
    for (const exp of experiences) {
      resultExperiences[foundry.utils.randomID()] = {
        name: exp.name,
        value: exp.value
      };
    }
    
    return resultExperiences;
  }
  
  _mapRange(rangeText) {
    const rangeMap = {
      "Melee": "melee",
      "Very Close": "veryClose",
      "Close": "close",
      "Far": "far",
      "Very Far": "veryFar",
    }
    return rangeMap[rangeText]
  }
  
  /**
   * Create items from parsed data (features only)
   */
  async _createItems(parsedData) {
    const items = [];
    
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
    
    const itemData = {
      name: feature.name,
      type: 'feature',
      img: this[`default_${feature.type}_feature_image`],
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
        cost: actionDetails.cost,
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
        name: this._getActionName(feature),
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
  _getActionName(feature) {
    // Name based on cost first
    let actionName = ""
    for (let cost of feature.cost) {
      let costName = ""
      let conjunction = ""
      if (actionName.length > 0) {
        conjunction = " and "
      }
      switch (cost.key) {
        case "stress":
          costName = "Stress"
          break
        case "fear":
          costName = "Fear"
          break
        case "hope":
          costName = "Hope"
          break
        case "armor":
          costName = "Armor"
          break
        case "hp":
          costName = "HP"
          break
      }
      actionName += costName + conjunction
    }
    if (actionName.length > 0) { return actionName }
    
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
    const description = (feature.description).toLowerCase();
    const name = (feature.name).toLowerCase();
    const details = {
      cost: feature.cost,
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
    } else if (description.includes('within very close range')) {
      details.range = 'veryClose';
    } else if (description.includes('within close range')) {
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