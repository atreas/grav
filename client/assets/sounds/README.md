# Game Sound Effects

This directory contains sound effects for the game. You need to add actual sound files here for the audio to work.

## Required Sound Files

The game expects the following sound files (in .mp3, .wav, or .ogg format):

1. `thrust` - Sound when the ship is thrusting
2. `collision` - Sound when the ship collides with a wall
3. `checkpoint` - Sound when passing through a checkpoint
4. `lap_complete` - Sound when completing a lap
5. `race_start` - Sound when a race starts
6. `countdown` - Sound for countdown numbers
7. `countdown_go` - Sound for "GO!" at the start of a race
8. `button_click` - Sound for UI interactions
9. `background_music` - Background music for the game

For example, you could have `thrust.mp3`, `collision.wav`, and `checkpoint.ogg` - the system will automatically use the first available format it finds.

## Recommended Sources for Free Sound Effects

You can find free sound effects at the following websites:

1. [Freesound](https://freesound.org/) - Large database of CC-licensed sounds
2. [OpenGameArt](https://opengameart.org/) - Free game assets including sounds
3. [Mixkit](https://mixkit.co/free-sound-effects/) - Free sound effects for games
4. [ZapSplat](https://www.zapsplat.com/) - Free sound effects library

## Supported File Formats

The game supports the following audio formats (in order of preference):

1. MP3 (.mp3)
2. WAV (.wav)
3. OGG (.ogg)

The system will automatically try to load each sound in these formats, using the first one that works in your browser.

## Adding Your Own Sounds

1. Download or create sound files in any supported format (mp3, wav, ogg)
2. Name them according to the list above, with the appropriate extension
3. Place them in this directory
4. The game will automatically load them when started

For example, if you have a thrust sound in WAV format, save it as `thrust.wav` in this directory.

## Sound Credits

When using sounds from external sources, make sure to credit the original creators and follow their licensing requirements.
