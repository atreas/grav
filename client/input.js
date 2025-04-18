class InputHandler {
    constructor() {
        this.keys = {};

        // Set up event listeners
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
    }

    handleKeyDown(e) {
        this.keys[e.key] = true;

        // Prevent default behavior for arrow keys
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
        }

        // Toggle debug panel with tilde key
        if (e.key === '`' || e.key === '~') {
            const debugPanel = document.getElementById('debug-info');
            if (debugPanel) {
                debugPanel.classList.toggle('hidden');
            }
            e.preventDefault();
        }
    }

    handleKeyUp(e) {
        this.keys[e.key] = false;
    }

    isKeyPressed(key) {
        return this.keys[key] || false;
    }
}
