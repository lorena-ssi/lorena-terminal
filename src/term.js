const terminal = require('terminal-kit').terminal
const figlet = require('figlet')

terminal.on('key', function (name, matches, data) {
  if (name === 'CTRL_C') {
    terminal.grabInput(false)
    setTimeout(function () { process.exit() }, 100)
  }
})

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
  lorena: () => terminal.cyan('\nlor# '),
  message: (label, text = '') => {
    terminal('\n^+' + label + ' ^' + text)
  },
  singleColumnMenu: async (menuItems, options = undefined) => {
    // term.singleColumnMenu( menuItems , [options] , [callback] )
    return await terminal.singleColumnMenu(menuItems, options).promise
  }
}

module.exports = term
