import fs from 'fs';
import {WriteStream} from 'fs';
import dayjs from 'dayjs';
import path from 'path';


class LogFileStream {
  private basePath: string;
  private index: number;
  private writeStream: WriteStream;

  constructor(private path: string, private maxSizeInBytes: number, index: number) {
    this.index = index;
    this.basePath = this.buildBaseLogPath()
    console.log('### basePath', this.basePath);
    this.writeStream = this.createWriteStream()
  }

  private createWriteStream = () => {
    const newFilePath = this.appendIndexToLogFile();
    return fs.createWriteStream(newFilePath, {encoding: "utf8",});
  }

  private buildBaseLogPath = () => {
    return this.path.replace(/\{.*?\}/, (pattern) => dayjs().format(pattern.replace(/[{}]/g, '')))
  }

  private appendIndexToLogFile(): string {
    const items = this.basePath.split('/')
    const fileName = items.pop()
    if (fileName === undefined) {
      throw new Error(`Invalid file: ${this.basePath}`);
    }

    const dotIndex = fileName?.lastIndexOf('.');
    if (dotIndex === undefined || dotIndex === -1) {
      return this.basePath + '.1'
    } else {
      const newFileName = fileName.substring(0, dotIndex) + `.${this.index}` + fileName.substring(dotIndex);
      return [...items, newFileName].join('/')
    }
  }

  useOrRotate = (): LogFileStream => {
    const newPath = this.buildBaseLogPath();
    if (newPath !== this.basePath) {
      this.writeStream.end()
      return new LogFileStream(this.path, this.maxSizeInBytes, 1);
    }
    if (this.writeStream.bytesWritten >= this.maxSizeInBytes) {
      this.writeStream.end()
      return new LogFileStream(this.path, this.maxSizeInBytes, this.index + 1)
    }
    return this;
  }

  writeLine = (message: string): void => {
    console.log('write', message.length)
    this.writeStream.write(message + "\n");
  }

  complete = () => {
    this.writeStream.end();
  }

}

class Logger {
  private logFile: LogFileStream;

  constructor(private path: string, private maxSizeInBytes: number) {
    this.logFile = new LogFileStream(path, maxSizeInBytes, 1)
  }


  log = (message: string) => {
    process.nextTick(() => {
      this.logFile = this.logFile.useOrRotate();
      this.logFile.writeLine(message);
    })
  }

  complete = () => {
    process.nextTick(() => {
      this.logFile.complete();
    })
  }

}

const logger = new Logger(path.resolve(__dirname, 'logs/log-{YYYYMMDDHHmm}.txt'), 1024)

let i = 0;
setInterval(() => {
  logger.log(`${i} - hello`)
  if (i === 1000) {
    logger.complete();
  }
},1000)
// for (let i = 0; i < 1000000; i++) {
//
// }


