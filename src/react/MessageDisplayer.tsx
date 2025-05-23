import { BaseHostRoom } from "../sdk";
import type { GameState, PlayerState, MessageType, MessagePayloads } from "../sdk_extension_logic/schema";
import { useEffect, useState } from "react";

interface MessageDisplayerProps {
    room: BaseHostRoom<GameState<PlayerState>, PlayerState, MessageType, MessagePayloads>;
}

function MessageDisplayer({ room }: MessageDisplayerProps) {
    const [message, setMessage] = useState<string>("");
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            if (room.state.game_display_message) {
                setMessage(room.state.game_display_message);
                setIsVisible(true);
            } else {
                setIsVisible(false);
                // Wait for animation to complete before clearing message
                setTimeout(() => {
                    if (!room.state.game_display_message) {
                        setMessage("");
                    }
                }, 300); // Match this with CSS transition duration
            }
        }, 100);

        return () => clearInterval(interval);
    }, [room]);

    return (
        <div className="message-wrapper">
            <div className={`message-container ${isVisible ? 'visible' : ''}`}>
                {message}
            </div>
        </div>
    );
}

export default MessageDisplayer;
