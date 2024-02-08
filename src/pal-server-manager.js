import ChildProcess from "child_process";
import { PalCommand } from "./pal-command.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class PalServerManager {
  constructor() {
    this.process = null;
    this.palCommand = null;
  }

  async isRunning() {
    return (
      this.process !== null &&
      this.process.exitCode === null &&
      (await this.palCommand.isConnected())
    );
  }

  async start(channel) {
    console.log(`[PROCESS] PalServer starting...`);
    this.palCommand = new PalCommand();
    this.process = ChildProcess.exec(
      `${process.env.PALWORLD_PATH}/PalServer.sh -useperfthreads -NoAsyncLoadingThread -UseMultithreadForDS`
    );
    this.process.on("exit", async (code, signal) => {
      console.log(`[PROCESS] PalServer finished. Restarting...`);
      await channel.send("サーバーが停止しました。再起動します。");
      this.process.removeAllListeners("exit");
      this.start();
    });
    await sleep(5000);
    await this.palCommand.connect();
    console.log(`[PROCESS] PalServer started.`);
    await channel.send("サーバーを起動しました");
  }

  async stop(
    time = 30,
    message = "PalServer will shut down after 30 seconds."
  ) {
    console.log(`[PROCESS] PalServer stopping...`);
    await this.save();
    await this.palCommand.send(
      `Shutdown ${time} ${message.replace(/\s/g, `_`)}`
    );
  }

  async save() {
    await this.palCommand.send(`Save`);
  }

  async backup(channel) {
    this.process.removeAllListeners("exit");
    await channel.send("バックアップを開始します");
    this.process.on("exit", async (code, signal) => {
      await channel.send("サーバーを停止しました");
      console.log(`[PROCESS] PalServer Stopped.`);
      this.process = null;
      console.log(`[BACKUP] Backup Starting...`);
      const filename = `PalBackup_${new Date()
        .toLocaleString("ja-JP")
        .replace(/[\/:]/g, "-")
        .replace(/\s/g, "_")}.tar.gz`;
      ChildProcess.execSync(
        `tar -zcvf ${process.env.PALWORLD_PATH}/${filename} -C / ${process.env.PALWORLD_PATH}/Pal/Saved/SaveGames/0/${process.env.PAL_SERVER_ID}`
      );
      ChildProcess.execSync(
        `aws s3 cp --endpoint-url ${process.env.S3_ENDPOINT} ${process.env.PALWORLD_PATH}/${filename} s3://palworld-backup/${filename}`
      );
      ChildProcess.execSync(`rm ${process.env.PALWORLD_PATH}/${filename}`);
      console.log(`[BACKUP] Backup Completed`);
      await channel.send("バックアップが完了しました");
      this.start(channel);
    });
    await this.stop();
  }

  async seeyou(channel) {
    this.process.removeAllListeners("exit");
    this.process.on("exit", async (code, signal) => {
      await channel.send("サーバー/Botを停止しました");
      process.exit(0);
    });
    await this.stop();
  }

  async versionUpdate(channel) {
    this.process.removeAllListeners("exit");
    await channel.send("バージョンアップを開始します");
    this.process.on("exit", async (code, signal) => {
      await channel.send("サーバーを停止しました");
      console.log(`[PROCESS] PalServer Stopped.`);
      this.process = null;

      console.log(`[BACKUP] Backup Starting...`);
      const filename = `PalBackup_${new Date()
        .toLocaleString("ja-JP")
        .replace(/[\/:]/g, "-")
        .replace(/\s/g, "_")}.tar.gz`;
      ChildProcess.execSync(
        `tar -zcvf ${process.env.PALWORLD_PATH}/${filename} -C / ${process.env.PALWORLD_PATH}/Pal/Saved/SaveGames/0/${process.env.PAL_SERVER_ID}`
      );
      ChildProcess.execSync(
        `aws s3 cp --endpoint-url ${process.env.S3_ENDPOINT} ${process.env.PALWORLD_PATH}/${filename} s3://palworld-backup/${filename}`
      );
      ChildProcess.execSync(`rm ${process.env.PALWORLD_PATH}/${filename}`);
      console.log(`[BACKUP] Backup Completed`);
      await channel.send("バックアップが完了しました");

      console.log(`[UPDATE] Version Update Starting...`);
      ChildProcess.execSync(
        `sudo chattr -a ${process.env.PALWORLD_PATH}/Pal/Binaries/Linux/`
      );
      ChildProcess.execSync(
        `steamcmd +login anonymous +app_update 2394010 validate +quit`
      );
      ChildProcess.execSync(
        `sudo chattr +a ${process.env.PALWORLD_PATH}/Pal/Binaries/Linux/`
      );
      console.log(`[UPDATE] Version Update Completed`);
      await channel.send("バージョンアップが完了しました");
      this.start(channel);
    });
    await this.stop();
  }

  async getPlayerList() {
    if (!(await this.palCommand?.isConnected())) return [];
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
