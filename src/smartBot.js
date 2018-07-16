const fs = require('fs');
const puppeteer = require('puppeteer');

const timeout = ms => new Promise(res => setTimeout(res, ms));

const smartBot = async () => {
  console.log('new smartbot');
  const INPUT_DELAY = 20;
  const localStoragePath = './botGameData.json';
  const groupCount = 10;

  let obj = {
    isRunning: false,
    browser: null,
    page: null,
    async start(gameID) {
      this.isRunning = true;
      this.browser = await puppeteer.launch({
        // headless: false,
      });
      this.page = await this.browser.newPage();
      
      await this.page.setViewport({ width: 1440, height: 780});
      await this.page.goto(`http://generals.io/games/${gameID}`);
      

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
      await timeout(2000);
      await this.page.waitForSelector('button:not(.small)', {
        visible: true,
      });
      await timeout(1000);
      console.log('hi');

      await this.page.click('button:not(.small)', {
        delay: INPUT_DELAY,
      });

      await this.page.waitForSelector('#map', {
        visible: true
      });
      await timeout(500);

      await this.page.evaluate(async () => {
        
        async function tick() {
          let turn = getTurn();
          if (turn < turnToMove) {
            return;
          }

          // adjust turn tick
          turnToMove = turn;
          let cells = getCells();


          let aggressiveActions = getAggressiveActions(getCells());
          if (aggressiveActions.length > 0) {
            for (const move of aggressiveActions) {
              await makeMove(move.from, move.to);
            }
            return;
          }
          
          let expandActions = getExpandActions(getCells());
          if (expandActions.length > 0) {
            for (const move of expandActions) {
              await makeMove(move.from, move.to);
            }
            return;
          }

          let edgeCells = getEdgeCells(cells);
          let targetCell = edgeCells[Math.floor(Math.random() * edgeCells.length)];
          
          let grid = getGrid(cells);
  
          let topCells = getTopCells(topLimit, cells);
          for (const from of topCells) {
            let path = finder.findPath(from.x, from.y, targetCell.x, targetCell.y, grid.clone());
            for (let i = 0; i < path.length-1; i++) {
              await makeMove({
                x: path[i][0],
                y: path[i][1],
              }, {
                x: path[i+1][0],
                y: path[i+1][1],
              });
            }
            return;
          }

          console.log('no moves left');
        }
        async function main() {
          isInit = true;
          let cells = getCells();
          color = getColor(cells);
          h = cells.length;
          w = cells[0].length;
          console.log('h: '+h);

          Object.assign(document.querySelector('.relative').style, {
            left: '0px',
            top: '100px',
          });

          for (const row of cells) {
            for (const each of row) {
              if (each.kind.indexOf(color) >= 0 && each.kind.indexOf('general') >= 0) {
                king.x = each.x;
                king.y = each.y;
              }

              Object.assign(each.el.style, {
                width: '1px',
                minWidth: '1px',
                maxWidth: '1px',
                height: '1px',
                minHeight: '1px',
                maxHeight: '1px',
                fontSize: '1px',
              });
            }
          }

          turnToMove = getTurn();
          console.log('init done');

          while (true) {
            await tick();
            await timeout(200);
          }
        }
        main();
      });
    },
    async stop() {
      this.isRunning = false;
      console.log('smartbot exit');  
      await this.page.close();
      await this.browser.close();
    }
  };
  obj.start = obj.start.bind(obj);
  obj.stop = obj.stop.bind(obj);
  return obj;
};

module.exports = smartBot;