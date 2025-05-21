import {
    BaseClient as ImportedClient,
    ClientRoom as ImportedClientRoom,
    HostRoom as ImportedHostRoom,
  } from "./client";
  import { GameLogic } from "./logic";
  import {
    BaseGameState as ImportedGameState,
    BaseMessagePayloads as ImportedMessagePayloads,
    BaseMessageType as ImportedMessageType,
    BasePlayerState as ImportedPlayerState,
  } from "./schema";
  import { ServerRoom } from "./server";
  import { getRoomIdByCode } from "./utils";
  
  export { getRoomIdByCode };
  
  // Re-export the base types
  export type BasePlayerState = ImportedPlayerState;
  export type BaseMessageType = ImportedMessageType;
  export type BaseMessagePayloads = ImportedMessagePayloads;
  export type BaseGameState<P extends BasePlayerState> = ImportedGameState<P>;
  
  export type { SupabaseAdapter } from "./supabase-adapter";
  
  // Export the client class to be extended
  export { ImportedClient as BaseClient };
  
  // Export room classes to be extended
  export {
    ImportedClientRoom as BaseClientRoom,
    ImportedHostRoom as BaseHostRoom,
  };
  
  // Export the game logic class to be extended
  export { GameLogic as BaseGameLogic };
  
  // Export the server room class to be extended
  export { ServerRoom as BaseServerRoom };
  
  export type { Reward, User } from "./schema";