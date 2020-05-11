const terminal = require('terminal-kit').terminal
const figlet = require('figlet')
const util = require('util')

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
  input: async (label, options = {}) => {
    const result = await terminal.color256(82, label + ' : ').inputField(options).promise
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
    return terminal.inputField(params).promise
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
    console.log(util.inspect(json, { colors: true }))
  },
  error: (text) => { terminal.red(text + '\n') },
  lorena: (env = '') => terminal.cyan('\nlor' + env + '# '),
  message: (label, text = '') => {
    terminal('\n^+' + label + ' ^' + text)
  },
  singleColumnMenu: async (menuItems, options = undefined) => {
    return terminal.singleColumnMenu(menuItems, options).promise
  },
  ctrlC: (lorena) => {
    terminal.on('key', async (name) => {
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
              const password = await terminal.inputField({ echo: false }).promise
              console.log('\npassword', password)
              terminal.gray('Saving changes to the wallet\n')
              await lorena.lock(password)
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

terminal.on('key', async (name, matches, data) => {
  if (name === 'CTRL_D') {
    terminal.grabInput(false)
    terminal.gray('\nLeaving...\n')
    // Closing program
    process.exit()
  }
})

module.exports = term
