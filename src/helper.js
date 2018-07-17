const fs = require('fs');
const puppeteer = require('puppeteer');

const helper = async () => {
  const INPUT_DELAY = 10;
  const localStoragePath = './gameData.json';
  
  let obj = {
    isRunning: false,
    browser: null,
    page: null,
    async start(gameID) {
      this.isRunning = true;
      this.browser = await puppeteer.launch({
        headless: false,
        // executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google\ Chrome',
      });
      this.page = await this.browser.newPage();
      await this.page.setViewport({ width: 1440, height: 780});

      if (gameID) {
        await this.page.goto(`http://generals.io/games/${gameID}`);
      } else {
        await this.page.goto(`http://generals.io/`);
      }
      

      if (fs.existsSync(localStoragePath) && fs.lstatSync(localStoragePath).isFile()) {
        let storage = fs.readFileSync(localStoragePath, 'utf8');
        try {
          await this.page.evaluate((storage) => {
            for (let key in storage) {
              localStorage.setItem(key, storage[key]);
            }
          }, JSON.parse(storage));
      
          await this.page.reload();
        } catch (e) {
          console.error(`Error restoring localStorage: ${e.message}`)
        }
      }

      await this.page.addScriptTag({
        path: './lib/pathfinding-browser.min.js'
      });
      await this.page.addScriptTag({
        path: './src/shared.js'
      });
      await this.page.exposeFunction('click', async (x, y) => {
        await this.page.click(`#map > tbody > tr:nth-child(${y+1}) > td:nth-child(${x+1})`, {
          delay: INPUT_DELAY,
        });
      });

      await this.page.exposeFunction('clearSelect', async () => {
        await this.page.type('#map', ' ', {
          delay: INPUT_DELAY,
        });
      });

      await this.page.evaluate(async () => {
        
        document.addEventListener('keydown', async e => {
          if (e.defaultPrevented) {
            return;
          }
        
          let handled = false;
        
          if (e.keyCode === 67) {   // c -> fill space
            if (!isInit) {
              alert('init first');
              return;
            }
        
            handled = true;
            console.log('f pressed');
            let expandActions = getExpandActions(getCells());
            for (const move of expandActions) {
              await makeMove(move.from, move.to);
            }
          } else if (e.keyCode === 71) {  // g -> group
            if (!isInit) {
              alert('init first');
              return;
            }
        
            handled = true;
            console.log('g pressed');
            let groupActions = getGroupActions(getCells());
            for (const move of groupActions) {
              await makeMove(move.from, move.to);
            }
          } else if (e.keyCode === 69) {  // e -> aggressive fill
            if (!isInit) {
              alert('init first');
              return;
            }
        
            handled = true;
            console.log('e pressed');
            let aggressiveActions = getAggressiveActions(getCells());
            for (const move of aggressiveActions) {
              await makeMove(move.from, move.to);
            }
          } else if (e.keyCode == 72) { // h -> go home, save the queen!
            if (!isInit) {
              alert('init first');
              return;
            }
        
            handled = true;
            console.log('h pressed');
            let cells = getCells();
            let grid = getGrid(cells);
    
            let selected = {};
    
            for (const row of cells) {
              for (const each of row) {
                if (each.kind.indexOf('selected') >= 0) {
                  selected = each;
                }
              }
            }
    
            let topCells = getTopCells(topLimit, cells);
            for (const from of topCells) {
              let path = finder.findPath(from.x, from.y, selected.x, selected.y, grid.clone());
              for (let i = 0; i < path.length-1; i++) {
                await makeMove({
                  x: path[i][0],
                  y: path[i][1],
                }, {
                  x: path[i+1][0],
                  y: path[i+1][1],
                }, );
              }
            }
          } else if (e.keyCode === 73) {  // i -> init
            isInit = true;
            let cells = getCells()
            color = getColor(cells);
            h = cells.length;
            w = cells[0].length;
            
            for (const row of cells) {
              for (const each of row) {
                if (each.kind.indexOf(color) >= 0 && each.kind.indexOf('general') >= 0) {
                  king.x = each.x;
                  king.y = each.y;
                }
              }
            }
            alert('init done');
          }
        
          if (handled) {
            e.preventDefault();
          }
        });
      });
    },
    async stop() {
      this.isRunning = false;
      console.log('exit');
      let storage = await this.page.evaluate(() => {
        let value, storage = {};
        for (let key in localStorage) {
          if (value = localStorage.getItem(key))
            storage[key] = value;
        }
  
        return storage;
      });
      fs.writeFileSync(localStoragePath, JSON.stringify(storage));
        
      await this.browser.close();
    }
  };
  obj.start = obj.start.bind(obj);
  obj.stop = obj.stop.bind(obj);
  return obj;
};

module.exports = helper;