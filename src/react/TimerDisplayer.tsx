import { BaseHostRoom } from "../sdk";
import type { GameState, PlayerState, MessageType, MessagePayloads } from "../sdk_extension_logic/schema";
import { useEffect, useState, useRef } from "react";

interface TimerDisplayerProps {
    room: BaseHostRoom<GameState<PlayerState>, PlayerState, MessageType, MessagePayloads>;
}

function TimerDisplayer({ room }: TimerDisplayerProps) {
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [isPulsing, setIsPulsing] = useState(false);
    const prevTimeRef = useRef<number>(0);

    useEffect(() => {
        const interval = setInterval(() => {
            if (room.state.guessing_phase_timer) {
                const newTime = Math.ceil(room.state.guessing_phase_timer);
                if (newTime !== prevTimeRef.current) {
                    setIsPulsing(true);
                    setTimeout(() => setIsPulsing(false), 300);
                    prevTimeRef.current = newTime;
                }
                setTimeLeft(newTime);
            } else {
                setTimeLeft(0);
            }
        }, 100);

        return () => clearInterval(interval);
    }, [room]);

    if (timeLeft <= 0) {
        return null;
    }

    return (
        <div className={`timer-container ${isPulsing ? 'pulse' : ''}`}>
             {timeLeft} 
        </div>
    );
}

export default TimerDisplayer;