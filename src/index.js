const term = require( 'terminal-kit' ).terminal;

const puppet = require('./puppet');
const timeout = ms => new Promise(res => setTimeout(res, ms));

async function cli() {
  const helper = await puppet.helper();

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
    'g': {
      '?': async (args) => {
        const info = [
          ['gs ?gameID', 'start game'],
          ['gh',         'stop/halt game'],
        ];
        for (const each of info) {
          term.green(each[0]+': ');
          
          term.right(30-each[0].length);
          term.cyan(each[1]);
          console.log('');
        }
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

    if (func) func(cmd.slice(1, cmd.length));

  }
}

cli();