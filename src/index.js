const puppeteer = require('puppeteer');

const timeout = ms => new Promise(res => setTimeout(res, ms));

(async () => {
  // const gameID = 12345
  const browser = await puppeteer.launch({
    headless: false,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 780});

  await page.goto('http://generals.io/');
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
      let maxActions = cell.value === NaN || cell.value === 1 ? 0 : 1;
    
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
        let cells = getCells();
        let expandActions = getExpandActions(getCells());
        for (const move of expandActions) {
          console.log('called');
          console.log(cells[move.from.y][move.from.x].el);
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
})();