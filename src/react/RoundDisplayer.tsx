import { BaseHostRoom } from "../sdk";
import type { GameState, PlayerState, MessageType, MessagePayloads } from "../sdk_extension_logic/schema";
import { useEffect, useState } from "react";

interface RoundDisplayerProps {
    room: BaseHostRoom<GameState<PlayerState>, PlayerState, MessageType, MessagePayloads>;
}

function RoundDisplayer({ room }: RoundDisplayerProps) {
    const [round, setRound] = useState<number>(0);

    useEffect(() => {
        const interval = setInterval(() => {
            if (room.state.round) {
                setRound(room.state.round);
            }
        }, 100);

        return () => clearInterval(interval);
    }, [room]);

    if (round <= 0) {
        return null;
    }

    return (
        <div className="round-container">
            Round {round}
        </div>
    );
}

export default RoundDisplayer; 