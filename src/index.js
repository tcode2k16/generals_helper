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
          ['bl gameID ?num', 'launch n smart bots'],
          ['bS', 'start all created smart bots'],
          ['bh',         'stop/halt all smart bots'],
        ]);
      },
      's': async (args) => {
        for (const each of smartBots) {
          each.start();
        }
      },
      'l': async (args) => {
        if (!args || !args[0]) {
          term.red('need gameID!\n');
          return;
        }

        let num = 1;
        if (args[1] && !isNaN(parseInt(args[1]))) {
          num = parseInt(args[1]);
        }

        let gameID = args[0];
        for (let i = 0; i < num; i++) {
          let smartBot = await puppet.smartBot();
          smartBots.push(smartBot);
          smartBot.launch(gameID);
        }
      },
      'h': async () => {
        for (const each of smartBots) {
          if (each.isRunning) {
            await each.stop();
          }          
        }
        smartBots = [];
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