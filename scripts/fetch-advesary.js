export class StatblockFetcher {
  async fetch(link) {
    if (!link || typeof link !== "string") {
      throw new Error(game.i18n.localize("daggerheart-statblock-importer.notifications.empty"));
    }

    const id = new URL(link).searchParams.get("id");

    try {
      const data = await this._call_freshcutgrass_api(id);

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("No adversary found with that ID on Fresh Cut Grass.");
      }

      const apiData = data[0];
      const features = this._build_features(apiData.features)
      const [type, subtype] = this._build_type(apiData.type)
      const attackInfo = this._build_attack(apiData.weapon)
      const experiences = this._build_experiences(apiData.experience)
      const motivesAndTactics = Array.isArray(apiData.motivesAndTactics) 
          ? apiData.motivesAndTactics.join(",\n") 
          : apiData.motivesAndTactics || ""

      const result = {
        name: apiData.name,
        type: type,
        tier: apiData.tier || 1,
        subtype: subtype,
        description: apiData.shortDescription || "",
        difficulty: apiData.difficulty || 10,
        attack: apiData.attackModifier || 0,
        attackInfo: attackInfo,
        experiences: experiences,
        motivesAndTactics: motivesAndTactics,
        features: features,
        hitPoints: {  
          major: apiData.damageThresholds?.major || 0, 
          severe: apiData.damageThresholds?.severe || 0,
          total: apiData.hitPoints || 0
        },
        hordeHp: apiData.hordeUnitsPerHp || 1,
        stress: apiData.stress || 0,
        resistances: apiData.resistances || [],
        immunities: apiData.immunities || [],
        vulnerabilities: apiData.vulnerabilities || []
      };

      return result;

    } catch (error) {
      console.error("Daggerheart Statblock Importer | Fetch failed:", error);
      throw new Error("Failed to fetch statblock: " + error.message);
    }
  }

  async _call_freshcutgrass_api(id) {
    const freshcutgrass_api_url = "https://freshcutgrass.app/api/adversaries/public/by-ids"
    const proxy_api_url = "https://daggerheart-freshcutgrass-importer.twozzendell.workers.dev/"

    const response = await fetch(`${proxy_api_url}?url=${freshcutgrass_api_url}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids: [id] })
    });

    if (!response.ok) {
      throw new Error(`Network error: ${response.status} ${response.statusText}`);
    }

    return await response.json()
  }

  _build_features(featuresArray) {
    const resultedFeatures = []
    for (let feature of featuresArray || []) {
      const formattedCost = []
      for (const key of Object.keys(feature.cost) || []) {
        formattedCost.push({
          key: key,
          value: feature.cost[key],
          keyIsID: false,
          step: null,
          scalable: false,
        });
      }

      const formattedFeature = {
        name: feature.value ? `${feature.name} (${feature.value})` : feature.name,
        type: feature.type ? feature.type.toLowerCase() : "",
        cost: formattedCost,
        summon: feature.summon || [],
        description: feature.description || "",
      }
      resultedFeatures.push(formattedFeature)
    }
    return resultedFeatures
  }

  _build_type(typeString) {
    let resultType = ""
    let resultSubtype = ""
    if (typeString) {
      const splittedType = typeString.split(/(?=[A-Z])/)
      resultType = splittedType[0].toLowerCase() // In any case main type will be splittedType[0]

      // If we don't have a subtype, then subtype = type
      if (splittedType.length === 1) {
        resultSubtype = resultType
      } else {
        resultSubtype = splittedType[1].toLowerCase()
      }
    }
    return [resultType, resultSubtype]
  }

  _build_attack(weaponInfo) {
    // (\d+d\d+) -> Captures the dice ("1d20")
    // (?:\+(\d+))? -> Optionally matches a '+' followed by the bonus digits ("3")
    // (?:\s+(\w+))? -> Optionally matches spaces followed by the damage type ("phy")
    const regex = /^(\d+d\d+)(?:\+(\d+))?(?:\s+(\w+))?.*$/;
    const resultAttack = {
      name: "Attack",
      dice: "d6",
      bonus: "0",
      damageType: "phy",
      range: "Melee"
    }

    if (!!weaponInfo) {
      resultAttack.name = weaponInfo.name
      resultAttack.range = weaponInfo.range

      // Fill damage numbers only if it's present
      if (weaponInfo.damage.length > 0) {
        const match = weaponInfo.damage.match(regex);
        if (match) {
          resultAttack.dice = match[1] || ""
          resultAttack.bonus = match[2] || "0"
          resultAttack.damageType = match[3] || "phy"
        }
      }
    }

    return resultAttack
  }

  _build_experiences(experiences) {
    // (.*?) -> Captures any text or characters (non-greedy) at the beginning
    // (-?\d+) -> Captures a number, optionally starting with a minus sign ("3" or "-2")
    const regex = /^(.*?)\s*(?:\+)?(-?\d+)$/;
    const resultedExperiences = []

    for (let experience of experiences || []) {
      const match = experience.match(regex);
      if (match) {
        resultedExperiences.push({
          name: match[1].trim() || "",
          value: match[2] || "0",
        })
      }
    }
    return resultedExperiences
  }
}