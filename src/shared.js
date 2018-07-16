const timeout = ms => new Promise(res => setTimeout(res, ms));

let isInit = false;
let turnToMove = 0;
let color = '';
let h = 0;
let w = 0;
let king = {
  x: 0,
  y: 0,
};

const topLimit = 1;
const groupLimit = 10;
const finder = new PF.AStarFinder();

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
  let maxActions = (isNaN(cell.value) || cell.value < groupLimit) ? 0 : 1;

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
  let maxActions = (isNaN(cell.value) || cell.value === 1) ? 0 : 1;

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
  let maxActions = (isNaN(cell.value) || cell.value === 1) ? 0 : 1;

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

async function makeMove(from, to) {
  await window.clearSelect();
  await window.click(from.x, from.y);
  await window.click(to.x, to.y);
  turnToMove += 1/2;
}

function getColor(cells) {
  for (const row of cells) {
    for (const cell of row) {
      if (cell.kind.indexOf('selectable') >= 0) {
        return cell.kind[0];
      }
    }
  }
}

function getGrid(cells) {
  let matrix = cells.map(row => {
    return row.map(e => {
      return e.kind.indexOf(color) >= 0 ? 0 : 1;
    });
  });
  return new PF.Grid(matrix);
}

function getEdgeCells(cells) {
  let edgeCells = [];
  for (const row of cells) {
    for (const cell of row) {
      if (cell.kind.indexOf(color) >= 0 && cell.kind.indexOf('general') < 0 && isEdgeCell(cell, cells)) {
        edgeCells.push(cell);
      }
    }
  }
  return edgeCells;
}

function isEdgeCell(cell, cells) {
  let x = cell.x;
  let y = cell.y;
  let xl = x - 1;
  let xr = x + 1;
  let yu = y - 1;
  let yd = y + 1;

  let needItems = [color, 'mountain'];
  let edgeCount = 0;
  if (inRange(xl, y) && cells[y][xl].kind.every(r => needItems.indexOf(r) < 0)) {
    return true;
  }

  if (inRange(xr, y) && cells[y][xr].kind.every(r => needItems.indexOf(r) < 0)) {
    return true;
  }

  if (inRange(x, yu) && cells[yu][x].kind.every(r => needItems.indexOf(r) < 0)) {
    return true;
  }

  if (inRange(x, yd) && cells[yd][x].kind.every(r => needItems.indexOf(r) < 0)) {
    return true;
  }
  return false;
}

function getTopCells(topLimit, cells) {
  let topCells = {};
  let cellsCount = 0;
  for (const row of cells) {
    for (const cell of row) {
      if (cell.kind.indexOf(color) >= 0 && cell.kind.indexOf('general') < 0 && !isNaN(cell.value) && cell.value > 1) {
        let v = cell.value;
        if (topCells[v] === undefined) {
          topCells[v] = [cell];
        } else {
          topCells[v].push(cell);
        }
        cellsCount++;
      }
    }
  }

  let limitTop = [];
  while (limitTop.length < Math.min(topLimit, cellsCount)) {
    let topKey = Object.keys(topCells).sort((a, b) =>{
      return parseInt(b) - parseInt(a);
    })[0];
    limitTop.push(topCells[topKey].pop());
    if (topCells[topKey].length < 1) {
      delete topCells[topKey];
    }
  }
  return limitTop;
}

function getTurn() {
  return parseInt(document.querySelector('#turn-counter').innerText.split(' ')[1]);
}