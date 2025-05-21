import { Scene } from '@babylonjs/core';
import { AdvancedDynamicTexture, TextBlock, StackPanel, Control } from '@babylonjs/gui';
import type { GameState, PlayerState } from '../../sdk_extension_logic/schema';
import { GAME_CONSTANTS } from '../../sdk_extension_logic/schema';
import { BaseHostRoom } from '../../sdk';
import type { MessageType, MessagePayloads } from '../../sdk_extension_logic/schema';
export class UIEntity {
    // Class that will handle the UI for the game. 
    // Will have a text box at the top of the screen that can display messages.
    // Has a timer in the top right corner that displays a countdown.
    // Has a button that can be used to select a cup position. This will be disabled in production.

    private scene: Scene;
    private guiTexture: AdvancedDynamicTexture;
    private dynamicText: TextBlock;
    private timerText: TextBlock;
    private roundText: TextBlock;
    private stackPanel: StackPanel;
    private timerInterval: NodeJS.Timeout | null = null;

    private readonly gameMessages = {
        firstRoundWelcome: "Welcome to Three Cup Hockey! Keep your eyes on the helmet with the puck!",
        newRound: "ROUND",
        shuffling: "Shuffling cups...",
        pickCup: "Pick the helmet with the puck!",
        reveal: "Here was the puck!",
        gameOver: "Game Over! Thanks for playing!"
    };

    constructor(scene: Scene) {
        this.scene = scene;
        
        // Clear any existing UI
        const existingUIs = this.scene.textures.filter((texture): texture is AdvancedDynamicTexture => 
            texture instanceof AdvancedDynamicTexture
        );
        existingUIs.forEach((ui: AdvancedDynamicTexture) => ui.dispose());
        
        this.guiTexture = AdvancedDynamicTexture.CreateFullscreenUI("gameUI");
        this.stackPanel = this.createStackPanel();
        this.dynamicText = this.createDynamicText();
        this.timerText = this.createTimerText();
        this.roundText = this.createRoundText();
        this.setupUI();
    }

    private createStackPanel(): StackPanel {
        const stackPanel = new StackPanel();
        stackPanel.width = "100%";
        stackPanel.height = "100%";
        stackPanel.paddingTop = "20px";
        this.guiTexture.addControl(stackPanel);
        return stackPanel;
    }

    private createTimerText(): TextBlock {
        const text = new TextBlock();
        text.text = "";
        text.color = "#006847"; // Dallas Stars green
        text.fontSize = 68;
        text.height = "80px";
        text.width = "150px";
        text.fontFamily = "Impact, 'Arial Black', sans-serif";
        text.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        text.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        text.paddingRight = "30px";
        text.paddingTop = "20px";
        text.outlineWidth = 4;
        text.outlineColor = "#000000";
        text.shadowColor = "black";
        text.shadowOffsetX = 3;
        text.shadowOffsetY = 3;
        text.shadowBlur = 0;
        text.isVisible = false;
        return text;
    }

    private createDynamicText(): TextBlock {
        const text = new TextBlock();
        text.text = this.gameMessages.firstRoundWelcome;
        text.color = "#006847"; // Dallas Stars green
        text.fontSize = 36;
        text.height = "80px";
        text.fontFamily = "Impact, 'Arial Black', sans-serif";
        text.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        text.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        text.paddingTop = "20px";
        text.outlineWidth = 4;
        text.outlineColor = "#000000";
        text.shadowColor = "black";
        text.shadowOffsetX = 3;
        text.shadowOffsetY = 3;
        text.shadowBlur = 0;
        return text;
    }

    private createRoundText(): TextBlock {
        const text = new TextBlock();
        text.text = "Round 1";
        text.color = "#006847"; // Dallas Stars green
        text.fontSize = 56;
        text.height = "80px";
        text.fontFamily = "Impact, 'Arial Black', sans-serif";
        text.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        text.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        text.paddingLeft = "30px";
        text.paddingTop = "20px";
        text.outlineWidth = 4;
        text.outlineColor = "#000000";
        text.shadowColor = "black";
        text.shadowOffsetX = 3;
        text.shadowOffsetY = 3;
        text.shadowBlur = 0;
        text.top = "0px";
        text.left = "0px";
        text.isPointerBlocker = false;
        text.resizeToFit = true;
        return text;
    }

    private setupUI(): void {
        this.guiTexture.addControl(this.dynamicText);
        this.guiTexture.addControl(this.timerText);
        this.guiTexture.addControl(this.roundText);
    }

    private startTimer(duration: number): void {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        let timeLeft = duration;
        this.timerText.isVisible = true;
        this.timerText.text = timeLeft.toString();

        this.timerInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft >= 0) {
                this.timerText.text = timeLeft.toString();
            }
            
            if (timeLeft <= 0) {
                this.stopTimer();
            }
        }, 1000);
    }

    private stopTimer(): void {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.timerText.isVisible = false;
    }

    public setMessage(room: BaseHostRoom<GameState<PlayerState>, PlayerState, MessageType, MessagePayloads>): void {
        if (!this.dynamicText) return;

        // Update round text
        this.roundText.text = `Round ${room.state.round}`;

        // Always stop any existing timer when changing phases
        this.stopTimer();

        switch (room.state.game_phase) {
            case GAME_CONSTANTS.PHASES.DISPLAY_COUPON:
                if (room.state.round === 1) {
                    this.dynamicText.text = this.gameMessages.firstRoundWelcome;
                } else {
                    this.dynamicText.text = `${this.gameMessages.newRound} ${room.state.round}`;
                }
                break;
            case GAME_CONSTANTS.PHASES.SHUFFLE_CUPS:
                this.dynamicText.text = this.gameMessages.shuffling;
                break;
            case GAME_CONSTANTS.PHASES.GUESSING_PHASE:
                this.dynamicText.text = this.gameMessages.pickCup;
                // Start the timer for the guessing phase using the default 10 seconds if decision_time is not available
                this.startTimer(room.state.decision_phase_duration ?? 10);
                break;
            case GAME_CONSTANTS.PHASES.REVEAL_COUPON:
                this.dynamicText.text = this.gameMessages.reveal;
                break;
            case GAME_CONSTANTS.PHASES.GAME_OVER:
                this.dynamicText.text = this.gameMessages.gameOver;
                break;
        }

        this.animateText();
    }

    private animateText(): void {
        this.dynamicText.scaleX = 1.2;
        this.dynamicText.scaleY = 1.2;
        setTimeout(() => {
            this.dynamicText.scaleX = 1;
            this.dynamicText.scaleY = 1;
        }, 150);
    }

    public dispose(): void {
        this.stopTimer();
        if (this.dynamicText) {
            this.dynamicText.dispose();
        }
        if (this.timerText) {
            this.timerText.dispose();
        }
        if (this.roundText) {
            this.roundText.dispose();
        }
        if (this.stackPanel) {
            this.stackPanel.dispose();
        }
        if (this.guiTexture) {
            this.guiTexture.dispose();
        }
    }
}