import RCON from "easy-rcon";

export class PalCommand {
  constructor() {
    this.rcon = null;
    this.connected = false;
  }

  async connect() {
    this.rcon = RCON();
    await this.rcon.connect(process.env.RCON_IP, process.env.RCON_PORT, process.env.RCON_PASSWORD);
    this.connected = true;
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
