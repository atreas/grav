/**
 * Audio Manager for handling all game sound effects
 */
class AudioManager {
    constructor() {
        // Sound effect storage
        this.sounds = {};

        // Audio settings
        this.muted = false;
        this.volume = 0.7; // Default volume (0.0 to 1.0)

        // Track loading status
        this.loadingComplete = false;
        this.audioUnlocked = false;

        // Initialize sound categories
        this.initSounds();

        // Add keyboard shortcut for mute (M key)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'm' || e.key === 'M') {
                this.toggleMute();
            }

            // Any key press can unlock audio
            if (!this.audioUnlocked) {
                this.unlockAudio();
            }
        });

        // Set up UI controls
        this.setupUIControls();

        // Add a message to the debug info
        this.addDebugMessage();

        // Set up user interaction handlers to unlock audio
        this.setupUserInteractionHandlers();
    }

    /**
     * Set up handlers for user interaction to unlock audio
     */
    setupUserInteractionHandlers() {
        // List of events that count as user interaction
        const interactionEvents = ['click', 'touchstart', 'keydown'];

        const unlockAudioHandler = () => {
            if (!this.audioUnlocked) {
                console.log('User interaction detected, unlocking audio...');
                this.unlockAudio();
                this.audioUnlocked = true;

                // Play a test sound to verify audio is working
                setTimeout(() => {
                    this.play('button_click');
                }, 500);

                // Remove event listeners once audio is unlocked
                interactionEvents.forEach(event => {
                    document.removeEventListener(event, unlockAudioHandler);
                });
            }
        };

        // Add event listeners for user interaction
        interactionEvents.forEach(event => {
            document.addEventListener(event, unlockAudioHandler);
        });
    }

    /**
     * Add a message to the debug info about sound loading
     */
    addDebugMessage() {
        // Wait for DOM to be fully loaded
        document.addEventListener('DOMContentLoaded', () => {
            const debugInfo = document.getElementById('debug-info');
            if (debugInfo) {
                const soundInfo = document.createElement('div');
                soundInfo.id = 'sound-debug';
                soundInfo.innerHTML = 'Sound system: Loading sounds...';
                debugInfo.appendChild(soundInfo);

                // Update after a delay to check loading status
                setTimeout(() => {
                    const soundDebug = document.getElementById('sound-debug');
                    if (soundDebug) {
                        soundDebug.innerHTML = `Sound system: ${this.loadingComplete ? 'Ready' : 'Some sounds failed to load (check console)'}`;

                        // Remove the message after 5 seconds
                        setTimeout(() => {
                            if (soundDebug && soundDebug.parentNode) {
                                soundDebug.parentNode.removeChild(soundDebug);
                            }
                        }, 5000);
                    }
                }, 3000);
            }
        });
    }

    /**
     * Set up UI controls for audio
     */
    setupUIControls() {
        // Wait for DOM to be fully loaded
        document.addEventListener('DOMContentLoaded', () => {
            const muteButton = document.getElementById('mute-button');
            const volumeSlider = document.getElementById('volume-slider');

            if (muteButton) {
                muteButton.addEventListener('click', () => {
                    const isMuted = this.toggleMute();
                    muteButton.textContent = isMuted ? 'Unmute' : 'Mute';
                    muteButton.classList.toggle('muted', isMuted);
                });
            }

            if (volumeSlider) {
                // Set initial value
                volumeSlider.value = this.volume * 100;

                // Add change event
                volumeSlider.addEventListener('input', () => {
                    const volumeValue = volumeSlider.value / 100;
                    this.setVolume(volumeValue);
                });
            }
        });
    }

    /**
     * Initialize all game sounds
     */
    initSounds() {
        // Create a list of sounds to load
        const soundsToLoad = [
            { name: 'thrust', path: 'sounds/thrust' },
            { name: 'collision', path: 'sounds/collision' },
            { name: 'checkpoint', path: 'sounds/checkpoint' },
            { name: 'lap_complete', path: 'sounds/lap_complete' },
            { name: 'race_start', path: 'sounds/race_start' },
            { name: 'countdown', path: 'sounds/countdown' },
            { name: 'countdown_go', path: 'sounds/countdown_go' },
            { name: 'button_click', path: 'sounds/button_click' },
            { name: 'background_music', path: 'sounds/background_music', loop: true }
        ];

        // Load all sounds
        let loadedCount = 0;
        const totalSounds = soundsToLoad.length;

        soundsToLoad.forEach(sound => {
            this.loadSoundWithFallback(sound.name, sound.path, sound.loop || false)
                .then(success => {
                    loadedCount++;
                    if (loadedCount === totalSounds) {
                        console.log('All sounds processed. Loading complete.');
                        this.loadingComplete = true;
                    }
                });
        });

        // Set a timeout to mark loading as complete even if some sounds fail
        setTimeout(() => {
            if (!this.loadingComplete) {
                console.warn('Sound loading timed out. Some sounds may not be available.');
                this.loadingComplete = true;
            }
        }, 5000);
    }

    /**
     * Load a sound with format fallbacks (tries mp3, wav, ogg in that order)
     * @param {string} name - Sound identifier
     * @param {string} basePath - Base path to sound file without extension
     * @param {boolean} isLoop - Whether the sound should loop
     * @returns {Promise<boolean>} - Promise that resolves to true if sound was loaded successfully
     */
    loadSoundWithFallback(name, basePath, isLoop = false) {
        return new Promise(async (resolve) => {
            // Try to load with different extensions in order of preference
            const extensions = ['mp3', 'wav', 'ogg'];
            let loaded = false;

            console.log(`Attempting to load sound: ${name} from base path: ${basePath}`);

            // Try each extension until one works
            for (const ext of extensions) {
                const fullPath = `${basePath}.${ext}`;
                console.log(`Trying to load: ${fullPath}`);

                try {
                    // Check if file exists and can be played
                    const fileExists = await this.checkFileExists(fullPath);

                    if (!fileExists) {
                        console.log(`File not found or can't be played: ${fullPath}`);
                        continue; // Try next extension
                    }

                    // File exists, now check if browser supports the format
                    const mimeType = ext === 'mp3' ? 'audio/mpeg' :
                                    ext === 'wav' ? 'audio/wav' :
                                    'audio/ogg';

                    const dummyAudio = new Audio();
                    const canPlay = dummyAudio.canPlayType(mimeType);
                    console.log(`Browser support for ${ext} format: ${canPlay || 'none'}`);

                    if (canPlay === '') {
                        console.log(`Browser doesn't support ${ext} format`);
                        continue; // Try next extension
                    }

                    // Create the actual audio object for this sound
                    const audio = new Audio(fullPath);
                    audio.volume = this.volume;

                    if (isLoop) {
                        audio.loop = true;
                    }

                    // Set up event listeners before storing the sound
                    const loadPromise = new Promise((loadResolve) => {
                        // Success event
                        audio.addEventListener('canplaythrough', () => {
                            console.log(`Sound loaded successfully: ${name} (${ext})`);
                            loadResolve(true);
                        }, { once: true });

                        // Error event
                        audio.addEventListener('error', (e) => {
                            console.error(`Error loading sound ${name}: ${e.target.error?.message || 'Unknown error'}`);
                            loadResolve(false);
                        }, { once: true });

                        // Timeout in case events don't fire
                        setTimeout(() => loadResolve(false), 3000);
                    });

                    // Start loading the audio
                    audio.load();

                    // Wait for load to complete
                    const loadSuccess = await loadPromise;

                    if (!loadSuccess) {
                        console.warn(`Failed to load ${fullPath} after initial checks passed`);
                        continue; // Try next extension
                    }

                    // Store the sound
                    this.sounds[name] = {
                        audio: audio,
                        isPlaying: false,
                        isLoop: isLoop,
                        format: ext
                    };

                    // Add ended event to update isPlaying status
                    audio.addEventListener('ended', () => {
                        this.sounds[name].isPlaying = false;
                    });

                    console.log(`Successfully registered sound: ${name} using ${ext} format`);
                    loaded = true;
                    break; // Exit the loop, we found a working format
                } catch (error) {
                    console.warn(`Error processing ${fullPath}: ${error.message}`);
                }
            }

            if (!loaded) {
                console.warn(`Could not load sound ${name} in any format. Creating silent fallback.`);
                // Create a silent audio as a fallback to prevent errors when playing
                this.createSilentAudioFallback(name, isLoop);
            }

            resolve(loaded);
        });
    }

    /**
     * Check if a file exists and can be loaded
     * @param {string} url - URL of the file to check
     * @returns {Promise<boolean>} - Promise that resolves to true if file exists
     */
    checkFileExists(url) {
        return new Promise((resolve) => {
            const tempAudio = new Audio();

            // Set up event listeners
            tempAudio.addEventListener('canplaythrough', () => {
                resolve(true);
            }, { once: true });

            tempAudio.addEventListener('error', () => {
                resolve(false);
            }, { once: true });

            // Try to load the file
            tempAudio.src = url;
            tempAudio.load();

            // Set a timeout in case the events don't fire
            setTimeout(() => resolve(false), 2000);
        });
    }

    /**
     * Creates a silent audio object as a fallback when sound files can't be loaded
     * @param {string} name - Sound identifier
     * @param {boolean} isLoop - Whether the sound should loop
     */
    createSilentAudioFallback(name, isLoop) {
        // Create a short, silent audio buffer
        try {
            const audio = new Audio();
            audio.volume = 0; // Silent

            if (isLoop) {
                audio.loop = true;
            }

            this.sounds[name] = {
                audio: audio,
                isPlaying: false,
                isLoop: isLoop,
                isSilent: true
            };

            console.log(`Created silent fallback for sound: ${name}`);
        } catch (error) {
            console.error(`Failed to create silent fallback for ${name}: ${error.message}`);
        }
    }

    /**
     * Play a sound
     * @param {string} name - Sound identifier
     * @param {boolean} forceRestart - Whether to restart the sound if already playing
     */
    play(name, forceRestart = false) {
        if (this.muted) return;

        const sound = this.sounds[name];
        if (!sound) {
            console.warn(`Sound not found: ${name}`);
            return;
        }

        // Skip playing silent fallbacks but still update state
        if (sound.isSilent) {
            sound.isPlaying = true;
            setTimeout(() => { sound.isPlaying = false; }, 500); // Simulate short sound
            return;
        }

        try {
            // If sound is already playing and we don't want to restart it
            if (sound.isPlaying && !forceRestart) {
                return;
            }

            // If we want to restart or sound is not playing
            if (forceRestart && sound.isPlaying) {
                sound.audio.currentTime = 0;
            }

            // Check if the audio is fully loaded
            if (sound.audio.readyState < 2) { // HAVE_CURRENT_DATA (2) or higher needed
                console.log(`Sound ${name} not fully loaded, setting up load event`);

                // Set up one-time event for when audio is loaded enough to play
                sound.audio.addEventListener('canplaythrough', () => {
                    console.log(`Sound ${name} now loaded, playing...`);
                    this.playSound(sound, name);
                }, { once: true });

                // Try to load the audio
                sound.audio.load();
            } else {
                // Audio is ready to play
                this.playSound(sound, name);
            }
        } catch (error) {
            console.error(`Error playing sound ${name}: ${error.message}`);
        }
    }

    /**
     * Internal method to actually play a sound once it's ready
     * @param {Object} sound - The sound object
     * @param {string} name - Sound identifier (for logging)
     */
    playSound(sound, name) {
        try {
            // Log detailed information about the sound
            console.log(`Attempting to play sound: ${name}`);
            console.log(`Sound format: ${sound.format || 'unknown'}`);
            console.log(`Sound state: ${sound.audio.readyState}`);
            console.log(`Sound path: ${sound.audio.src}`);

            const playPromise = sound.audio.play();

            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        sound.isPlaying = true;
                        console.log(`✅ Successfully playing sound: ${name}`);
                    })
                    .catch(error => {
                        console.error(`❌ Browser prevented playing sound ${name}: ${error.message}`);
                        // Some browsers require user interaction before playing audio
                        if (error.name === 'NotAllowedError') {
                            console.log('⚠️ Audio playback requires user interaction first');
                            // Try to play a silent sound to unlock audio
                            this.unlockAudio();
                        }
                    });
            } else {
                sound.isPlaying = true;
                console.log(`✅ Playing sound: ${name} (no promise returned)`);
            }
        } catch (error) {
            console.error(`❌ Error in playSound for ${name}: ${error.message}`);
        }
    }

    /**
     * Attempt to unlock audio playback on user interaction
     * Some browsers require user interaction before playing audio
     */
    unlockAudio() {
        console.log('Attempting to unlock audio...');
        // Create a silent audio context and play it
        try {
            const silentAudio = new Audio();
            silentAudio.volume = 0.01; // Nearly silent
            const playPromise = silentAudio.play();

            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log('Audio unlocked successfully');
                        silentAudio.pause();
                    })
                    .catch(error => {
                        console.log(`Failed to unlock audio: ${error.message}`);
                    });
            }
        } catch (error) {
            console.error(`Error unlocking audio: ${error.message}`);
        }
    }



    /**
     * Stop a sound
     * @param {string} name - Sound identifier
     */
    stop(name) {
        const sound = this.sounds[name];
        if (!sound) {
            console.warn(`Sound not found: ${name}`);
            return;
        }

        try {
            sound.audio.pause();
            sound.audio.currentTime = 0;
            sound.isPlaying = false;
        } catch (error) {
            console.error(`Error stopping sound ${name}: ${error.message}`);
        }
    }

    /**
     * Set the volume for all sounds
     * @param {number} level - Volume level (0.0 to 1.0)
     */
    setVolume(level) {
        this.volume = Math.max(0, Math.min(1, level));

        // Update volume for all sounds
        Object.values(this.sounds).forEach(sound => {
            sound.audio.volume = this.volume;
        });

        console.log(`Volume set to ${this.volume}`);
    }

    /**
     * Toggle mute state
     */
    toggleMute() {
        this.muted = !this.muted;

        if (this.muted) {
            // Pause all currently playing sounds
            Object.entries(this.sounds).forEach(([name, sound]) => {
                if (sound.isPlaying) {
                    sound.audio.pause();
                }
            });
            console.log('Sound muted');
        } else {
            // Resume looping sounds
            Object.entries(this.sounds).forEach(([name, sound]) => {
                if (sound.isLoop) {
                    sound.audio.play().catch(error => {
                        console.error(`Error resuming sound ${name}: ${error.message}`);
                    });
                }
            });
            console.log('Sound unmuted');
        }

        return this.muted;
    }

    /**
     * Play thrust sound with special handling for continuous play
     * @param {boolean} isThrusting - Whether the ship is currently thrusting
     */
    playThrustSound(isThrusting) {
        const thrustSound = this.sounds['thrust'];

        if (!thrustSound) return;

        if (isThrusting) {
            // If not already playing, start it
            if (!thrustSound.isPlaying) {
                this.play('thrust');
            }
        } else {
            // Stop the thrust sound when not thrusting
            this.stop('thrust');
        }
    }

    /**
     * Start background music
     */
    startBackgroundMusic() {
        this.play('background_music');
    }
}
