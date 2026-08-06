# Daggerheart Freshcutgrass Importer

A Foundry VTT module for importing Daggerheart adversary and environment statblocks directly from freshcutgrass.app into the Foundryborne Daggerheart system.

## Features

- **Easy Import**: Copy and paste link to statblock from freshcutgrass.app ([example link](https://freshcutgrass.app/homebrew?id=uoHvyG83mBqs4YAxPpGB8n))
- **Automatic Fetching**: Fetch data automatically from freshcutgrass.app 
- **Actor Creation**: Automatically creates (mostly) properly configured Daggerheart actors
- **Item Generation**: Creates embedded items for features and attacks

## Installation

### Foundry VTT Module Browser

1. Open Foundry VTT
2. Go to the "Add-on Modules" tab
3. Click "Install Module"
4. Paste "https://github.com/Zendelll/daggerheart-freshcutgrass-importer/releases/latest/download/module.json" into "Manifest URL" field
5. Click "Install"

### Manual Installation

1. Download the latest release from the [releases page](https://github.com/Zendelll/daggerheart-freshcutgrass-importer/releases)
2. Extract the zip file to your Foundry VTT `Data/modules` directory
3. Restart Foundry VTT
4. Enable the module in your world's module settings

## Usage

1. **Open the Import Dialog**: In the Actors directory, click the "Import Statblock" button
2. **Paste Link to a Statblock**: Copy the statblock link from freshcutgrass.app and paste it into the text area
3. **Import**: Click the "Import Statblock" button to fetch and create the actor
4. **Review**: The created actor will automatically open for review and editing. It's advisable to check actions and configure them if needed. It's almost impossible to fully automate action creation without mistakes, using action description as the data source.

## Development

### Building

No build process is required. The module uses vanilla JavaScript ES6 modules.

## Compatibility

- **Foundry VTT**: v14+
- **System**: Daggerheart (Foundryborne) v2.5.4+
There is a big chance that the module works with older versions too, but it wasn't tested.

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## Support

For support, please:
1. Search existing [issues](https://github.com/Zendelll/daggerheart-freshcutgrass-importer/issues)
2. Create a new issue with detailed information about your problem

## Acknowledgments

- Thanks to the Foundryborne team for the excellent Daggerheart system
- Thanks to original module's author [50gnr](https://github.com/50gnr) for their work. It wouldn't be possible without them!
- Thanks to [FreshCutGrass](https://freshcutgrass.app) for the app we all love and use
- Built for the Daggerheart community
