const headless = require('./headless');

const timeout = ms => new Promise(res => setTimeout(res, ms));

const smartBot = async (browser) => {
  const INPUT_DELAY = 20;

  let obj = {
    isRunning: false,
    browser: null,
    page: null,
    async launch(gameID) {
      this.isRunning = true;

      if (!headless.isRunning) {
        await headless.start();
      }
      this.browser = headless.browser;

      const context = await this.browser.createIncognitoBrowserContext();
      this.page = await context.newPage();
      
      await this.page.setViewport({ width: 1440, height: 780});
      await this.page.goto(`http://generals.io/games/${gameID}`);

      try {
        await this.page.evaluate((storage) => {
          for (let key in storage) {
            localStorage.setItem(key, storage[key]);
          }
        }, {
          "completed_tutorial":"true",
          "gio_ffa_rules":"true",
        });
    
        await this.page.reload();
      } catch (e) {
        console.error(`Error restoring localStorage: ${e.message}`)
      }

      this.page.on("pageerror", function(err) {  
        theTempValue = err.toString();
        console.log("Page error: " + theTempValue); 
      });

      this.page.on('console', msg => {
        for (let i = 0; i < msg.args().length; ++i)
          console.log(`${i}: ${msg.args()[i]}`);
      });

      await this.page.addScriptTag({
        path: './lib/pathfinding-browser.min.js'
      });
      await this.page.addScriptTag({
        path: './src/shared.js'
      });
      await this.page.exposeFunction('click', async (x, y) => {
        await this.page.click(`#gameMap > tbody > tr:nth-child(${y+1}) > td:nth-child(${x+1})`, {
          delay: INPUT_DELAY,
        });
      });

      await this.page.exposeFunction('type', async text => {
        await this.page.type('#gameMap', text, {
          delay: INPUT_DELAY,
        });
      });

      await this.page.exposeFunction('clearSelect', async () => {
        await this.page.type('#gameMap', ' ', {
          delay: INPUT_DELAY,
        });
      });
      console.log('new smartbot online');
    },
    async start() {
      while (true) {
        try {
          let started = await this.page.$eval('#gameMap', el => el.style.display !== 'none' || el.style.visibility !== 'hidden');
          if (!started) {
            throw "not started";
          }
        } catch (e) {
          try {
            await this.page.waitForSelector('button:not(.small):not(.inverted)', {
              visible: true,
              timeout: 1000,
            });
          } catch (err) {
            continue;
          }
  
          try {
            await this.page.click('button:not(.small):not(.inverted)', {
              delay: INPUT_DELAY,
            });
          } catch (err) {
            continue;
          }

          continue;
        }
        break;
      }
      console.log('game start');
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

          if (king.isDiscovered) {
            await burstMove(king.x, king.y, cells, false);
            king.isDiscovered = false;
            return;
          }

          checkKingBorder(cells);

          let otherKing = getOtherKing(cells);
          if (otherKing !== null) {
            await burstMove(otherKing.x, otherKing.y, cells, false);
            return;
          }

          let aggressiveActions = getAggressiveActions(getCells());
          if (aggressiveActions.length > 0) {
            for (const move of aggressiveActions) {
              await makeMove(move.from, move.to);
            }
            return;
          }
          
          // let expandActions = getExpandActions(getCells());
          // if (expandActions.length > 0) {
          //   for (const move of expandActions) {
          //     await makeMove(move.from, move.to);
          //   }
          //   return;
          // }

          let topCells = getTopCells(topLimit, cells);
          let edgeCells = getEdgeCells(cells).filter(e => topCells.indexOf(e) < 0);
          let targetCell = edgeCells[Math.floor(Math.random() * edgeCells.length)];
          
          let grid = getGrid(cells);
          
          if (edgeCells.length > 0) {
            for (const from of topCells) {
              if (from.x === targetCell.x && from.y === targetCell.y) continue;
              let path = finder.findPath(from.x, from.y, targetCell.x, targetCell.y, grid.clone());
              for (let i = 0; i < path.length-1; i++) {
                await makeMove(
                  cells[path[i][1]][path[i][0]],
                  cells[path[i+1][1]][path[i+1][0]],
                );
              }
            }
            return;
          }

          return;
          
          // console.log('no moves left');
        }
        async function main() {
          while (true) {
            if (document.querySelector('#gameMap').rows && document.querySelector('#gameMap').rows.length > 0) {
              break;
            }
            await timeout(200);
          }

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
      console.log('smartbot exit');  
      if (headless.isRunning) {
        await headless.stop();
      }
      this.isRunning = false;
    }
  };
  obj.start = obj.start.bind(obj);
  obj.stop = obj.stop.bind(obj);
  return obj;
};

module.exports = smartBot;