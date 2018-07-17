const puppeteer = require('puppeteer');

const timeout = ms => new Promise(res => setTimeout(res, ms));

const headless = () => {
  let obj = {
    isRunning: false,
    browser: null,
    onLock: false,
    async start() {
      if (this.onLock) {
        while (this.onLock) {
          await timeout(100);
        }
      }
      if (!this.isRunning) {
        this.onLock = true;
        this.browser = await puppeteer.launch({
          // headless: false,
        });
        this.isRunning = true;
        this.onLock = false;
      }
    },
    async stop() {
      if (this.onLock) {
        while (this.onLock) {
          await timeout(100);
        }
      }
      if (this.isRunning) {
        this.onLock = true;
        await this.browser.close();
        this.isRunning = false;  
        this.onLock = false;
      }
      
    }
  };
  return obj;
};

module.exports = headless();