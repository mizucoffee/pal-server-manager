import RCON from "easy-rcon";

export class PalCommand {
  constructor() {
    this.rcon = null;
    this.connected = false;
    this.retryCount = 0;
  }

  async connect() {
    this.rcon = RCON();
    try {
      await this.rcon.connect(process.env.RCON_IP, process.env.RCON_PORT, process.env.RCON_PASSWORD);
      this.connected = true;
    } catch (e) {
      await sleep(1000);
      this.retryCount++;
      if (this.retryCount < 5) {
        await this.connect();
      } else {
        console.error("[RCON] Failed to connect to RCON.");
      }
    }
  }

  async disconnect() {
    await this.rcon.disconnect();
    this.rcon = null;
  }

  async send(command) {
    return await this.rcon.send(command);
  }

  async isConnected() {
    return this.rcon != null && this.connected;
  }

  async isRunning() {
    return this.rcon.isConnected() // && this.rcon.isConnect();
  }
}
