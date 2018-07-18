const timeout = ms => new Promise(res => setTimeout(res, ms));

let foundKing = false;
let isInit = false;
let turnToMove = 0;
let color = '';
let h = 0;
let w = 0;
let king = {
  x: 0,
  y: 0,
  isDiscovered: false,
};

const burstCount = 1;
const objNotToPass = ['mountain', 'obstacle'];
const valuableTiles = ['general', 'city'];
const topLimit = 1;
const groupLimit = 10;
const finder = new PF.AStarFinder();

function getCells() {
  return Array.from(document.querySelector('#map').rows)
    .map((e, rowI) =>
      Array.from(e.cells)
        .map((c, colI) => {
          let kind = c.className
            .replace('small', '')
            .replace('large', '')
            .replace('tiny', '')
            .replace('attackable', '')
            .trim()
            .split(' ');
          let value = parseInt(c.innerHTML);

          if (isInit && isValuableTile({
            kind
          })) {
            value = Math.floor(value/2);
          }

          return {
            kind,
            value,
            y: rowI,
            x: colI,
            el: c,
          };
        })
    );
}

function getBorderCells(cell, cells) {
  let x = cell.x;
  let y = cell.y;
  let xl = x - 1;
  let xr = x + 1;
  let yu = y - 1;
  let yd = y + 1;

  let borderItems = [
    { x: xl, y: y, },
    { x: xr, y: y, },
    { x: x,  y: yu, },
    { x: x,  y: yd, },
  ];

  return borderItems
    .filter(e => inRange(e.x, e.y))
    .map(e => cells[e.y][e.x]);
}

function _getAction(cell, cells, func) {
  let borderItems = getBorderCells(cell, cells);
  
  // convert to action
  borderItems = borderItems.map(e => ({
    from: cell,
    to: e,
  }));
  
  // shuffle
  let r = Math.floor(Math.random()*borderItems.length);
  borderItems = [
    ...borderItems.slice(r),
    ...borderItems.slice(0, r),
  ];

  // check condition
  return borderItems.filter(func);
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
  const avoidItems = [color, 'mountain', 'going to fill', ''];

  if (isNaN(cell.value) || cell.value === 1) return [];

  let actions = _getAction(cell, cells, ({ from, to }) => {
    let valid = to.kind.every(r => avoidItems.indexOf(r) < 0) && (isNaN(to.value) || to.value+1 < from.value);
    if (valid) {
      to.kind[0] = 'going to fill';
    }
    return valid;
  });

  if (actions.length < 1) return [];

  // see if there is a king or city
  let townActions = [];
  for (const action of actions) {
    if (action.to.kind.indexOf('general') >= 0) {
      return [action];
    } else if (action.to.kind.indexOf('city') >= 0) {
      townActions.push(action);
    }
  }

  if (townActions.length > 0) return [townActions[0]];
  return actions.slice(0, 1);
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
  const avoidItems = [color, 'mountain', 'going to fill', ''];

  if (isNaN(cell.value) || cell.value === 1) return [];

  let actions = _getAction(cell, cells, ({ from, to }) => {
    let valid = to.kind[0] === '';
    if (valid) {
      to.kind[0] = 'going to fill';
    }
    return valid;
  });

  if (actions.length < 1) return [];

  return actions.slice(0, 1);
}

function inRange(x, y) {
  return x >= 0 && x < w && y >= 0 && y < h;
}

function isValuableTile(cell) {
  return cell.kind.indexOf(color) >= 0 && cell.kind.some(r => valuableTiles.indexOf(r) >= 0);
}

async function makeMove(from, to, force) {
  await window.clearSelect();
  if (isValuableTile(from) && !force) {
    await window.click(from.x, from.y);
  }
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

function getGrid(cells, safe=true) {
  let matrix = cells.map(row => {
    return row.map(e => {
      return safe ? (e.kind.indexOf(color) >= 0 ? 0 : 1) : (e.kind.some(r => objNotToPass.indexOf(r) >= 0 ? 1 : 0));
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
      // if (cell.kind.indexOf(color) >= 0 && cell.kind.indexOf('general') < 0 && !isNaN(cell.value) && cell.value > 1) {
        if (cell.kind.indexOf(color) >= 0 && !isNaN(cell.value) && cell.value > 1) {
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

function checkKingBorder(cells) {
  const borderCells = getBorderCells(cells[king.y][king.x], cells);
  const safeItems = [color, 'mountain', '']
  for (const each of borderCells) {
    if (!each.kind.some(r => safeItems.indexOf(r) >= 0)) {
      king.isDiscovered = true;
      return
    }
  }
}

function getOtherKing(cells) {
  for (const row of cells) {
    for (const cell of row) {
      if (cell.kind.indexOf(color) < 0 && cell.kind.indexOf('general') >= 0) {
        return cell;
      }
    }
  }
  return null;
}

async function burstMove(x, y, cells, safe=true) {
  let topCells = getTopCells(burstCount, cells);
  let targetCell = cells[y][x];
  
  let grid = getGrid(cells, safe);

  for (const from of topCells) {
    let path = finder.findPath(from.x, from.y, targetCell.x, targetCell.y, grid.clone());
    for (let i = 0; i < path.length-1; i++) {
      await makeMove(
        cells[path[i][1]][path[i][0]],
        cells[path[i+1][1]][path[i+1][0]],
        true
      );
    }
  }
}