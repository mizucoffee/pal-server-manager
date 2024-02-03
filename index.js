
import Dotenv from "dotenv";
import { Client, GatewayIntentBits } from "discord.js";
import { PalServerManager } from "./src/pal-server-manager.js";

Dotenv.config();
const palServerManager = new PalServerManager();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.on("messageCreate", async ({ author, content, channel }) => {
  if (author.bot) return;
  if (!content.startsWith("!")) return;
  console.log("[DISCORD] Command received: " + content);
  switch (content) {
    case "!start":
      console.log(`[PROCESS] PalServer starting...`);
      await palServerManager.start();
      await channel.send("サーバーを起動しました");
      console.log(`[PROCESS] PalServer started.`);
      break;
    // case "!stop":
    //   channel.send(await rcon.stop());
    //   break;
    case "!players":
      await channel.send((await rcon.getPlayerList()).join("\n"));
      break;
    default:
      return;
  }
});

let currentPlayerCount = null;

async function timer() {
  if(palServerManager.isRunning()) {
    const playerList = await palServerManager.getPlayerList();
    const playerCount = playerList.length;

    if (currentPlayerCount !== playerCount) {
      console.log("[TIMER] Current players update: " + playerList.join(", "));
      currentPlayerCount = playerCount;
      client.user.setActivity({
        name: `${playerCount}人がオンライン`,
        type: 4,
      });
    }
  } else {
    client.user.setActivity({
      name: "サーバー停止中",
      type: 4,
    });
  }

  setTimeout(timer, 1000);
}

client.on("ready", () => {
  console.log("[DISCORD] Discord bot started.");
  timer();
});

client.login(process.env.DISCORD_TOKEN);
