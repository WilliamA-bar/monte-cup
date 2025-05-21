import React, { useEffect, useRef } from "react";
import { BabylonGameController } from "./game_src/core/BabylonGameController";
import type { IGameController } from "./game_src/core/IGameController";
import "./App.css";
import { Client } from "./sdk_extension_logic/client";
import { BaseHostRoom } from "./sdk";
import type { GameState, PlayerState, MessageType, MessagePayloads } from "./sdk_extension_logic/schema";

const EXPO_PUBLIC_SUPABASE_URL = "https://kszfcyazbnkdffpnbsew.supabase.co"
const EXPO_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzemZjeWF6Ym5rZGZmcG5ic2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1MTUyMzAsImV4cCI6MjA2MTA5MTIzMH0.E65rnPLS_CE-wJPvlhrDmaSg-usTODjvR_ZLxRn5FZU"

// Use a constant UUID for development to maintain the same room
const ENGAGEMENT_ID = "550e8400-e29b-41d4-a716-446655440000";

export default function App() {
    
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameRef = useRef<IGameController | null>(null);
    const roomRef = useRef<BaseHostRoom<GameState<PlayerState>, PlayerState, MessageType, MessagePayloads> | null>(null);
    const hasInitialized = useRef(false);

    useEffect(() => {
        
        if (canvasRef.current && !hasInitialized.current) {
            hasInitialized.current = true;

            // Create SDK client and room
            const client = new Client(EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY);
            roomRef.current = client.create(ENGAGEMENT_ID);
            
            // Create game controller instance with canvas reference
            gameRef.current = new BabylonGameController(canvasRef.current, roomRef.current);
            
            // Start the game logic and then initialize the game
            (roomRef.current as any).gameLogic.startGame();
            gameRef.current?.start().catch(console.error);
        }

        // Cleanup function
        return () => {
            if (gameRef.current) {
                gameRef.current.dispose();
            }
            if (roomRef.current) {
                roomRef.current.cleanup();
            }
            hasInitialized.current = false;
        };
    }, []);

    return (
        <div className="scene-container">
            <canvas ref={canvasRef} id="renderCanvas" />
        </div>
    );
}