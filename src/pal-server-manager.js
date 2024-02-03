import ChildProcess from 'child_process';
import { PalCommand } from "./pal-command.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class PalServerManager {
  constructor() {
    this.process = null;
    this.palCommand = null;
  }

  async isRunning() {
    return this.process !== null && this.process.exitCode === null && await this.palCommand.isConnected();
  }

  async start() {
    this.process = ChildProcess.exec(`${process.env.PALWORLD_PATH}/PalServer.sh -useperfthreads -NoAsyncLoadingThread -UseMultithreadForDS`);
    this.palCommand = new PalCommand();
    this.process.on("exit", (code, signal) => {
      console.log(`[PROCESS] PalServer finished. restarting...`);
      this.process.removeAllListeners("exit");
      this.start();
    });
    await sleep(1000);
    await this.palCommand.connect();
  }

  async stop(time = 30, message = "PalServer will shut down after 30 seconds.") {
    await this.palCommand.send(`Shutdown ${time} "${message.replace(/\s/g, `_`)}"`);
  }

  async backup() {
    this.process.removeAllListeners("exit");
    this.process.on("exit", (code, signal) => {
      console.log(`[PROCESS] PalServer Stopped`);
      this.process = null;
      console.log(`[BACKUP] Backup Starting...`);
      const filename = `PalBackup_${new Date().toLocaleString("ja-JP").replace(/[\/:]/g, "-").replace(/\s/g, "_")}.tar.gz`;
      ChildProcess.execSync(`tar -zcvf ${process.env.PALWORLD_PATH}/${filename} ${process.env.PALWORLD_PATH}/Pal/Saved/SaveGames/0/${process.env.PAL_SERVER_ID}`);
      ChildProcess.execSync(`aws s3 cp ${process.env.PALWORLD_PATH}/${filename} s3://pal-backup/`);
      ChildProcess.execSync(`rm ${process.env.PALWORLD_PATH}/${filename}`);
      console.log(`[BACKUP] Backup Completed`);
      this.start();
    });
    await this.stop();
  }

  versionUpdate() {
    ChildProcess.execSync(`sudo chattr -a ${process.env.PALWORLD_PATH}/Pal/Binaries/Linux/`);
    ChildProcess.execSync(`steamcmd +login anonymous +app_update 2394010 validate +quit`);
    ChildProcess.execSync(`sudo chattr +a ${process.env.PALWORLD_PATH}/Pal/Binaries/Linux/`);
  }

  async getPlayerList() {
    if (!await this.palCommand?.isConnected()) return [];
    const response = await this.palCommand.send("ShowPlayers");
    const players = response
      .split("\n")
      .slice(1)
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const [name, uid, steamid] = line.split(",");
        return { name, uid, steamid };
      });
    return players.map((player) => player.name);
  }
}
