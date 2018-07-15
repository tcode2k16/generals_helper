const fs = require('fs');
const puppeteer = require('puppeteer');

const timeout = ms => new Promise(res => setTimeout(res, ms));

(async () => {
  // const gameID = 12345
  const localStoragePath = './gameData.json';
  const groupCount = 10;
  const browser = await puppeteer.launch({
    headless: false,
    // executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google\ Chrome',
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 780});

  // await page.goto('http://generals.io/');
  await page.goto('http://generals.io/games/12345');

  if (fs.existsSync(localStoragePath) && fs.lstatSync(localStoragePath).isFile()) {
    let storage = fs.readFileSync(localStoragePath, 'utf8');
    console.log(storage);
    try {
      await page.evaluate((storage) => {
        for (let key in storage) {
          localStorage.setItem(key, storage[key]);
        }
      }, JSON.parse(storage));
  
      await page.reload();
    } catch (e) {
      console.error(`Error restoring localStorage: ${e.message}`)
    }
  }

  await page.addScriptTag({
    path: '../lib/pathfinding-browser.min.js'
  });
  await page.exposeFunction('click', async (x, y) => {
    await page.click(`#map > tbody > tr:nth-child(${y+1}) > td:nth-child(${x+1})`, {
      delay: 10
    });
  });

  await page.exposeFunction('clearSelect', async () => {
    await page.type('#map', ' ', {
      delay: 10
    });
  });
  await page.evaluate(async () => {
    let isInit = false;
    let color = '';
    let h = 0;
    let w = 0;
    
    function getCells() {
      return Array.from(document.querySelector('#map').rows)
        .map((e, rowI) =>
          Array.from(e.cells)
            .map((c, colI) => ({
                kind: c.className
                  .replace('small', '')
                  .replace('large', '')
                  .replace('tiny', '')
                  .replace('attackable', '')
                  .replace('selectable', '')
                  .trim()
                  .split(' '),
                value: parseInt(c.innerHTML),
                y: rowI,
                x: colI,
                el: c
              })
            )
        );
    }
    function getGroupActions(cells) {
      let groupActions = [];
      for (const row of cells) {
        for (const cell of row) {
          if (cell.kind.indexOf(color) >= 0) {
            let actions = _getGroupAction(cell, cells);
            groupActions = [
              ...actions,
              ...groupActions
            ];
          }
        }
      }
      return groupActions;
    }
    
    function _getGroupAction(cell, cells) {
      let x = cell.x;
      let y = cell.y;
      let xl = x - 1;
      let xr = x + 1;
      let yu = y - 1;
      let yd = y + 1;
      const needItems = [color];
      // let maxActions = cell.value === NaN ? 0 : cell.value - 1;
      let maxActions = isNaN(cell.value) || cell.value < groupLimit ? 0 : 1;
    
      let actions = [];

      if (maxActions > 0 && inRange(xl, y) && cells[y][xl].kind.some(r => needItems.indexOf(r) >= 0) && !isNaN(cells[y][xl].value) && cells[y][xl].value > cell.value) {
        maxActions--;
        actions.push({
          from: {
            x,
            y,
          },
          to: {
            x: xl,
            y
          }
        });
        cells[y][x].value = 1;
        cells[y][xl].value += cell.value-1;
      }
    
      if (maxActions > 0 && inRange(xr, y) && cells[y][xr].kind.some(r => needItems.indexOf(r) >= 0) && !isNaN(cells[y][xr].value) && cells[y][xr].value > cell.value) {
        maxActions--;
        actions.push({
          from: {
            x,
            y,
          },
          to: {
            x: xr,
            y
          }
        });
        cells[y][x].value = 1;
        cells[y][xr].value += cell.value-1;
      }
    
      if (maxActions > 0 && inRange(x, yu) && cells[yu][x].kind.some(r => needItems.indexOf(r) >= 0) && !isNaN(cells[yu][x].value) && cells[yu][x].value > cell.value) {
        maxActions--;
        actions.push({
          from: {
            x,
            y,
          },
          to: {
            x,
            y: yu
          }
        });
        cells[y][x].value = 1;
        cells[yu][x].value += cell.value-1;
      }
    
      if (maxActions > 0 && inRange(x, yd) && cells[yd][x].kind.some(r => needItems.indexOf(r) >= 0) && !isNaN(cells[yd][x].value) && cells[yd][x].value > cell.value) {
        maxActions--;
        actions.push({
          from: {
            x,
            y,
          },
          to: {
            x,
            y: yd
          }
        });
        cells[y][x].value = 1;
        cells[yd][x].value += cell.value-1;
      }
    
      return actions;
    }

    function getAggressiveActions(cells) {
      let aggressiveActions = [];
      for (const row of cells) {
        for (const cell of row) {
          if (cell.kind.indexOf(color) >= 0) {
            let actions = _getAggressiveAction(cell, cells);
            aggressiveActions = [
              ...actions,
              ...aggressiveActions
            ];
          }
        }
      }
      return aggressiveActions;
    }
    
    function _getAggressiveAction(cell, cells) {
      let x = cell.x;
      let y = cell.y;
      let xl = x - 1;
      let xr = x + 1;
      let yu = y - 1;
      let yd = y + 1;
      const avoidItems = [color, 'mountain', 'going to fill', ''];
      // let maxActions = cell.value === NaN ? 0 : cell.value - 1;
      let maxActions = isNaN(cell.value) || cell.value === 1 ? 0 : 1;
    
      let actions = [];

      if (maxActions > 0 && inRange(xl, y) && cells[y][xl].kind.every(r => avoidItems.indexOf(r) < 0) && (isNaN(cells[y][xl].value) || cells[y][xl].value+1 < cell.value)) {
        maxActions--;
        actions.push({
          from: {
            x,
            y,
          },
          to: {
            x: xl,
            y
          }
        });
        cells[y][xl].kind[0] = 'going to fill';
      }
    
      if (maxActions > 0 && inRange(xr, y) && cells[y][xr].kind.every(r => avoidItems.indexOf(r) < 0) && (isNaN(cells[y][xr].value) || cells[y][xr].value+1 < cell.value)) {
        maxActions--;
        actions.push({
          from: {
            x,
            y,
          },
          to: {
            x: xr,
            y
          }
        });
        cells[y][xr].kind[0] = 'going to fill';
      }
    
      if (maxActions > 0 && inRange(x, yu) && cells[yu][x].kind.every(r => avoidItems.indexOf(r) < 0) && (isNaN(cells[yu][x].value) || cells[yu][x].value+1 < cell.value)) {
        maxActions--;
        actions.push({
          from: {
            x,
            y,
          },
          to: {
            x,
            y: yu
          }
        });
        cells[yu][x].kind[0] = 'going to fill';
      }
    
      if (maxActions > 0 && inRange(x, yd) && cells[yd][x].kind.every(r => avoidItems.indexOf(r) < 0) && (isNaN(cells[yd][x].value) || cells[yd][x].value+1 < cell.value)) {
        maxActions--;
        actions.push({
          from: {
            x,
            y,
          },
          to: {
            x,
            y: yd
          }
        });
        cells[yd][x].kind[0] = 'going to fill';
      }
    
      return actions;
    }

    function getExpandActions(cells) {
      let expandActions = [];
      for (const row of cells) {
        for (const cell of row) {
          if (cell.kind.indexOf(color) >= 0) {
            let actions = _getExpandAction(cell, cells);
            expandActions = [
              ...actions,
              ...expandActions
            ];
          }
        }
      }
      return expandActions;
    }
    
    function _getExpandAction(cell, cells) {
      let x = cell.x;
      let y = cell.y;
      let xl = x - 1;
      let xr = x + 1;
      let yu = y - 1;
      let yd = y + 1;
    
      // let maxActions = cell.value === NaN ? 0 : cell.value - 1;
      let maxActions = isNaN(cell.value) || cell.value === 1 ? 0 : 1;
    
      let actions = [];
    
      if (maxActions > 0 && inRange(xl, y) && cells[y][xl].kind[0] === '') {
        maxActions--;
        actions.push({
          from: {
            x,
            y,
          },
          to: {
            x: xl,
            y
          }
        });
        cells[y][xl].kind[0] = 'going to fill';
      }
    
      if (maxActions > 0 && inRange(xr, y) && cells[y][xr].kind[0] === '') {
        maxActions--;
        actions.push({
          from: {
            x,
            y,
          },
          to: {
            x: xr,
            y
          }
        });
        cells[y][xr].kind[0] = 'going to fill';
      }
    
      if (maxActions > 0 && inRange(x, yu) && cells[yu][x].kind[0] === '') {
        maxActions--;
        actions.push({
          from: {
            x,
            y,
          },
          to: {
            x,
            y: yu
          }
        });
        cells[yu][x].kind[0] = 'going to fill';
      }
    
      if (maxActions > 0 && inRange(x, yd) && cells[yd][x].kind[0] === '') {
        maxActions--;
        actions.push({
          from: {
            x,
            y,
          },
          to: {
            x,
            y: yd
          }
        });
        cells[yd][x].kind[0] = 'going to fill';
      }
    
      return actions;
    }
    
    function inRange(x, y) {
      return x >= 0 && x < w && y >= 0 && y < h;
    }
    
    function getColor(cells) {
      for (const row of cells) {
        for (const cell of row) {
          if (cell.kind.indexOf('general') >= 0) {
            return cell.kind[0];
          }
        }
      }
    }
    
    document.addEventListener('keydown', async e => {
      if (e.defaultPrevented) {
        return;
      }
    
      let handled = false;
    
      if (e.keyCode === 70) {   // f -> fill space
        if (!isInit) {
          alert('init first');
          return;
        }
    
        handled = true;
        console.log('f pressed');
        let expandActions = getExpandActions(getCells());
        for (const move of expandActions) {
          await window.clearSelect();
          await window.click(move.from.x, move.from.y);
          await window.click(move.to.x, move.to.y);
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
          await window.clearSelect();
          await window.click(move.from.x, move.from.y);
          await window.click(move.to.x, move.to.y);
        }
      } else if (e.keyCode === 69) {  // e -> aggressive fill
        if (!isInit) {
          alert('init first');
          return;
        }
    
        handled = true;
        console.log('e pressed');
        let aggressiveActions = getAggressiveActions(getCells());
        console.log(aggressiveActions);
        for (const move of aggressiveActions) {
          await window.clearSelect();
          await window.click(move.from.x, move.from.y);
          await window.click(move.to.x, move.to.y);
        }
      } else if (e.keyCode === 73) {  // i -> init
        isInit = true;
        let cells = getCells()
        color = getColor(cells);
        h = cells.length;
        w = cells[0].length;
        alert('init done');
      }
    
      if (handled) {
        e.preventDefault();
      }
    });
  });


  process.on('SIGINT', async () => {
    console.log("Caught interrupt signal");
    let storage = await page.evaluate(() => {
      let value, storage = {};
      for (let key in localStorage) {
        if (value = localStorage.getItem(key))
          storage[key] = value;
      }

      return storage;
    });
    fs.writeFileSync(localStoragePath, JSON.stringify(storage))
      
    await browser.close()
    process.exit();
  });
})();