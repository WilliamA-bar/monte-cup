/**
 * Interface for game controller implementations to follow.
 * This serves as the contract between the React application and game implementations.
 * By implementing this interface, different game implementations can be easily swapped without modifying the React code.
 */
export interface IGameController {
    /**
     * Initialize game resources like assets, scenes, etc.
     * This is called automatically by start() but can be called separately if needed.
     */
    initialize(): Promise<void>;
    
    /**
     * Start the game, including render loops and game logic.
     * Should call initialize() if not already initialized.
     */
    start(): Promise<void>;
    
    /**
     * Stop the game, pausing render loops and game logic.
     * The game should be able to resume after this is called.
     */
    stop(): Promise<void>;
    
    /**
     * Clean up all resources used by the game.
     * Called when the component unmounts or when switching implementations.
     */
    dispose(): void;
} 