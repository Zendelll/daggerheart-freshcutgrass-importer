export class StatblockFetcher {
  async fetch(link) {
    if (!link || typeof link !== "string") {
      throw new Error(game.i18n.localize("daggerheart-statblock-importer.notifications.empty"));
    }

    const result = {
          name: "",
          type: "adversary",
          tier: 1,
          subtype: "",
          description: "",
          difficulty: 10,
          attack: 0,
          attackInfo: null,
          experience: "",
          experiences: [], // Array for multi-line experiences
          motivesAndTactics: "",
          features: [],
          hitPoints: { minor: 0, major: 0, severe: 0 },
          stress: 0,
          resistances: [],
          immunities: [],
          vulnerabilities: []
        };

    // Extract the ID
    const url = new URL(link);
    const id = url.searchParams.get("id");

    try {
      // 1. Make the API request
      const response = await fetch("https://freshcutgrass.app/api/adversaries/public/by-ids", {
        method: "POST", // POST is required when sending a JSON body like { "ids": [...] }
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ids: [id] })
      });

      if (!response.ok) {
        throw new Error(`Network error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // 2. Validate the response
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("No adversary found with that ID on Fresh Cut Grass.");
      }

      // Grab the first object from the response array
      const apiData = data[0];


      const features = Array.isArray(apiData.features) 
        ? apiData.features.map(feature => {
            return {
              ...feature, // This spread operator keeps all other properties intact
              type: feature.type ? feature.type.toLowerCase() : "", // Safely convert type to lowercase
              name: feature.value ? feature.name + " (" + feature.value + ")" : feature.name // Add value to the name
            };
          }) 
        : [];
      const type = apiData.type.split(/(?=[A-Z])/).length > 1 ? apiData.type.split(/(?=[A-Z])/)[0].toLowerCase() : apiData.type.toLowerCase()
      const subtype = apiData.type.split(/(?=[A-Z])/).length > 1 ? apiData.type.split(/(?=[A-Z])/)[1].toLowerCase() : apiData.type.toLowerCase()
      
      var attackInfo = apiData.weapon || null
      if (!!attackInfo && attackInfo.damage.length > 0) {
        attackInfo.dice = attackInfo.damage.split("+")[0]
        if (attackInfo.damage.split("+").length > 1) {
            attackInfo.bonus = attackInfo.damage.split("+")[1].split(" ")[0]
            if (attackInfo.damage.split("+")[1].split(" ").length > 1) {
                attackInfo.damageType = attackInfo.damage.split("+")[1].split(" ")[1]
            }
        } else {
            attackInfo.bonus = "0"
        }
      }

      const experiences = Array.isArray(apiData.experience) 
        ? apiData.experience.map(expString => {
            // The regex separates the text from the number at the very end of the string
            // It handles positive numbers like "+2" or just "2", and negative numbers like "-1"
            const match = expString.match(/^(.*?)\s*(?:\+)?(-?\d+)$/);
            
            if (match) {
              return {
                name: match[1].trim(),
                value: match[2]
              };
            }
          }) 
        : [];

      // 3. Map the API response to your expected data structure
      const result = {
        name: apiData.name,
        type: type,
        tier: apiData.tier,
        subtype: subtype,
        description: apiData.shortDescription || "",
        difficulty: apiData.difficulty || 10,
        attack: apiData.attackModifier || 0,
        attackInfo: apiData.weapon || null, // API returns {name, range, damage}
        experience: "", 
        experiences: experiences,
        // API returns motivesAndTactics as an array, join it with line breaks
        motivesAndTactics: Array.isArray(apiData.motivesAndTactics) 
          ? apiData.motivesAndTactics.join(",\n") 
          : (apiData.motivesAndTactics || ""),
        features: features,
        
        // Map damageThresholds to your hitPoints format (API uses null for missing thresholds)
        hitPoints: { 
          minor: apiData.damageThresholds?.minor || 0, 
          major: apiData.damageThresholds?.major || 0, 
          severe: apiData.damageThresholds?.severe || 0,
          total: apiData.hitPoints || 0
        },
        stress: apiData.stress || 0,
        
        // Default to empty arrays if not present in the API
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
}