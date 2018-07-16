const term = require( 'terminal-kit' ).terminal;
const puppet = require('./puppet');

function printHelp(info) {
  for (const each of info) {
    term.green(each[0]+': ');
    
    term.right(30-each[0].length);
    term.cyan(each[1]);
    console.log('');
  }
}

async function cli() {
  const helper = await puppet.helper();
  let smartBots = [];

  const cmds = {
    'c': async () => {
      term.clear();
    },
    'q': async () => {
      if (helper.isRunning) {
        await helper.stop();
      }
      process.exit();
    },
    'h': {
      '?': async (args) => {
        printHelp([
          ['hs ?gameID', 'start game with helper'],
          ['hh',         'stop/halt game with helper'],
        ]);
      },
      's': async (args) => {
        let gameID = '';
        if (args && args[0]) {
          gameID = args[0];
        }
  
        if (helper.isRunning) {
          await helper.stop();
        }
  
        await helper.start(gameID);
      },
      'h': async () => {
        if (helper.isRunning) {
          await helper.stop();
        }
      }
    },
    'b': {
      '?': async (args) => {
        printHelp([
          ['bs gameID', 'start game with smart bot'],
          ['bh',         'stop/halt game with smart bot'],
        ]);
      },
      's': async (args) => {
        if (!args || !args[0]) {
          term.red('need gameID!\n');
          return;
        }

        let gameID = args[0];

        let smartBot = await puppet.smartBot();
        smartBots.push(smartBot);
        await smartBot.start(gameID);

      },
      'h': async () => {
        for (const each of smartBots) {
          if (each.isRunning) {
            await each.stop();
          }          
        }
      }
    }
  };  

  while (true) {
    term.yellow( "generals bot> " ) ;
    let cmd = await new Promise((resolve, reject) => {
      term.inputField((err, input) => {
        if (err) {
          reject(err);
        } else {
          resolve(input);
        }
      });
    }).catch(err => {
      console.log(err);
      cmds['q']();
    });
    console.log('');

    cmd = cmd.split(' ');
    cmd[0] = cmd[0].split('');

    let func = cmds;

    if (cmd[0].length < 1) {
      continue;
    }

    for (const each of cmd[0]) {
      if (!func[each]) {
        term.red('unknown command! try again!\n');
        func = null;
        break;
      }
      func = func[each];
    }

    if (func) {
      if (typeof func === 'function') {
        func(cmd.slice(1, cmd.length));
      } else {
        func['?'](cmd.slice(1, cmd.length));
      }
    }

  }
}

cli();