const terminal = require('terminal-kit').terminal
const figlet = require('figlet')

const term = {
  line: () => terminal('\n'),
  banner: (banner, text = '') => {
    return new Promise((resolve) => {
      figlet(banner, (_err, data) => {
        terminal.bold().color256(51, data)
        if (text !== '') terminal.magenta('\n' + text + '\n\n')
        resolve()
      })
    })
  },
  input: async (label) => {
    const result = await terminal.color256(82, label + ' : ').inputField().promise
    terminal('\n')
    return result
  },
  yesOrNo: async (label) => {
    terminal.color256(32, label).white(' y/n ')
    const result = await terminal.yesOrNo({ yes: ['y', 'ENTER'], no: ['n'] }).promise
    terminal('\n')
    return result
  },
  inputField: async (params) => {
    return await terminal.inputField(params).promise
  },
  array: (value) => {
    if (typeof value === 'object' && value.length > 0) {
      console.table(value)
    } else terminal.gray('Empty')
  },
  info: (text, value = '') => {
    terminal.gray(text)
    if (value !== '') {
      terminal.white(' ' + value)
    }
    terminal('\n')
  },
  json: (json = '') => {
    console.log(JSON.stringify(json, null, 4))
  },
  error: (text) => { terminal.red(text + '\n') },
  lorena: (env = '') => terminal.cyan('\nlor' + env + '# '),
  message: (label, text = '') => {
    terminal('\n^+' + label + ' ^' + text)
  },
  singleColumnMenu: async (menuItems, options = undefined) => {
    return await terminal.singleColumnMenu(menuItems, options).promise
  },
  ctrlC: async (lorena) => {
    terminal.on('key', async (name, matches, data) => {
      if (name === 'CTRL_C') {
        terminal.grabInput(false)
        if (lorena.contTerminal === undefined) {
          lorena.contTerminal = 1
          // If something has changed in wallet
          if (lorena.wallet.changed === true) {
            const yn = await term.yesOrNo('\nDo you want to save your information?')
            // If user wants to save changes
            if (yn) {
              // Saving changes
              terminal.color256(82, '\npassword : ')
              const psswd = await terminal.inputField({ echo: false }).promise
              console.log('\npassword', psswd)
              terminal.gray('Saving changes to the wallet\n')
              await lorena.lock(psswd)
            } else {
              terminal.gray('\nChanges will not be save.')
            }
          } else {
            terminal.gray('\nNo changes to save.')
          }
        } else {
          terminal.gray('\nChanges will not be save.')
          lorena.contTerminal = undefined
        }
        terminal.gray('\nLeaving...\n')
        // Closing program
        process.exit()
      }
    })
  }
}

module.exports = term
