#!/usr/bin/env node
const term = require('terminal-kit').terminal

// const Lorena = require('../../lorena-sdk/src/index').default
const Lorena = require('@lorena-ssi/lorena-sdk').default
const Wallet = require('@lorena-ssi/wallet-lib').default
const createWallet = require('./createWallet')
const callRecipe = require('./callRecipe')

let username = ''
let password = ''

term.on('key', function (name, matches, data) {
  if (name === 'CTRL_C') {
    term.grabInput(false)
    setTimeout(function () { process.exit() }, 100)
  }
})

// Main.
const main = async () => {
  term.magenta('Lorena ^+Client^\n')
  // Username & password.
  term.gray('\nUsername :')
  username = await term.inputField().promise
  term.gray('\nPassword :')
  password = await term.inputField().promise

  // Open Wallet and connect to Lorena
  const wallet = new Wallet(username)
  const lorena = new Lorena(wallet, { debug: true, silent: true })
  if (await lorena.unlock(password)) {
    term.gray('\nWallet open\n')
    await lorena.connect()
  } else {
    // No wallet.
    term.gray('\nA Wallet for ' + username + ' Does not exist').white('\nCreate One (Y/n)\n')
    if (await term.yesOrNo({ yes: ['y', 'ENTER'], no: ['n'] }).promise) {
      await createWallet(lorena, wallet, password)
      await lorena.connect()
    } else {
      process.exit()
    }
  }

  // Listen to Lorena messages.
  lorena.on('error', (e) => {
    term('ERROR!!', e)
  })
  lorena.on('ready', async () => {
    term('^+connected^\n')
    terminal(lorena, wallet)
  })

  // Someone's asking for a credential we have.
  lorena.on('message:credential-get', async (payload) => {
    term('\n^+Is asking for a credential ^')
    term('\n^+Share Credential (Y/N) ^\n')
    const shareCredential = await term.yesOrNo({ yes: ['y', 'ENTER'], no: ['n'] }).promise
    if (shareCredential) {
      const cred = lorena.wallet.data.credentials[0]
      console.log(payload)
      lorena.sendAction('credential-ask', payload.threadId, 'credential-get', 0, cred, payload.roomId)
      term('\n^Credential Sent^\n')
      term.cyan('lorena# ')
    }
  })

  // Someone sent a credential to us.
  lorena.on('message:credential-ask', async (payload) => {
    term(`\n^+Received credential ^${payload}`)
    term.cyan('lorena# ')
  })

  // We received a new Action.
  lorena.on('message:action-post', async (payload) => {
    term(`\n^+Received action ^${payload}`)
    term.cyan('lorena# ')
  })

  // Someone's contacting us.
  lorena.on('contact-incoming', (payload) => {
    term(`\n^+Contact invitation Incoming from ^${payload} \n`)
    term.cyan('lorena# ')
  })

  // A new contact has been added (accepted).
  lorena.on('contact-added', (payload) => {
    term(`\n^+Contact invitation Accepted from ^${payload}\n`)
    term.cyan('lorena# ')
  })
}

const runCommand = async (command, autoComplete, lorena, wallet) => {
  /**
   * Shut down the terminal, prompting to save
   */
  const shutdown = async () => {
    if (lorena.wallet.changed === true) {
      term.gray('\nChanges to the conf file\npassword : ')
      await lorena.lock(await term.inputField().promise)
    }
    term('\n^+Good bye!^\n\n')
    process.exit()
  }

  term('\n')
  const commands = {
    help: () => console.log(autoComplete),
    info: () => console.log(wallet.info),
    did: () => term.gray('DID : ').white(wallet.info.did + '\n'),
    credential: () => console.log(wallet.data.credentials['0'] ? wallet.data.credentials['0'] : 'empty'),
    credentials: () => console.log(wallet.data.credentials ? wallet.data.credentials : 'empty'),
    'credential-member': () => console.log(wallet.data.credentials['0'] ? wallet.data.credentials['0'].credentialSubject : 'empty'),
    rooms: () => console.log(wallet.data.contacts),
    room: async () => {
      const roomId = await term.gray('\nroomId : ').inputField().promise
      const room = await wallet.get('contacts', { roomId: roomId })
      console.log(room)
    },
    pubkey: async () => term.gray('Public Key : ').white(wallet.info.keyPair[wallet.info.did].keypair.public_key + '\n'),
    'room-add': async () => {
      const did = await term.gray('DID : ').inputField().promise
      const matrix = await term.gray('\nmatrix : ').inputField().promise
      const created = await lorena.createConnection(matrix, did)
      if (created) {
        term(`\n Created room: ${created}\n`)
      } else {
        term('\nError\n')
      }
    },
    'member-of': async () => { await lorena.memberOf(await term.gray('\nroomId : ').inputField().promise, await term.gray('\nExtra : ').inputField().promise, await term.gray('\nRolename : ').inputField().promise) },
    'member-of-confirm': async () => { await lorena.memberOfConfirm(await term.gray('\nroomId : ').inputField().promise, await term.gray('\nSecret code : ').inputField().promise) },
    'member-list': async () => { console.log((await callRecipe(lorena, 'member-list', { filter: 'all' })).payload) },
    ping: async () => { console.log((await callRecipe(lorena, 'ping')).payload) },
    'ping-admin': async () => { console.log((await callRecipe(lorena, 'ping-admin')).payload) },
    'credential-get': async () => {
      console.log((await callRecipe(lorena, 'credential-get', { credentialType: 'memberOf' })).payload)
      // await lorena.askCredential(payload.roomId, 'memberOf')
    },
    'action-issue': async () => {
      await callRecipe(lorena, 'action-issue', {
        did: await term.gray('DID : ').inputField().promise,
        action: await term.gray('Action : ').inputField().promise,
        description: await term.gray('\nDescription : ').inputField().promise
      })
    },
    exit: shutdown,
    q: shutdown,
    default: () => term.gray(`Command ${command} does not exist. For help type "help"\n`)
  }

  if (commands[command]) {
    await commands[command]()
  } else {
    await commands.default()
  }
}

/**
 * Opens the terminal
 *
 * @param {object} lorena Lorena Object
 * @param {object} wallet Local information (wallet)
 */
function terminal (lorena, wallet) {
  const history = []
  const autoComplete = ['help', 'info', 'member-of', 'member-of-confirm', 'member-list', 'credential', 'credentials', 'credential-member', 'pubkey', 'ping', 'ping-admin', 'ping-remote', 'room', 'rooms', 'room-add', 'action-issue', 'exit']
  term.cyan('lorena# ')
  term.inputField({ history: history, autoComplete: autoComplete, autoCompleteMenu: true }).promise
    .then(async (input) => {
      await runCommand(input, autoComplete, lorena, wallet)
      terminal(lorena, wallet)
    })
}
/*
    switch (input) {
      case 'ping-remote':
      case 'contact-info':
        term.gray('DID : ')
        payload = await term.inputField().promise
        term('\n')
        result = await callRecipe(lorena, input, { did: payload })
        console.log(result.payload)
        break
      case 'credential-get':
        payload = {}
        term.gray('RoomId : ')
        payload.roomId = await term.inputField().promise
        // term.gray('\nCredential (memberOf) : ')
        // payload.credential = await term.inputField().promise
        term.gray('\n')
        await lorena.askCredential(payload.roomId, 'memberOf')
        break
      case 'action-issue':
        payload = {}
        term.gray('ContactID : ')
        payload.contactId = await term.inputField().promise
        payload.subject = { name: 'Compra', description: 'Comprar en el Vendrell', location: 'Vendrell' }
        term('\n')
        result = await callRecipe(lorena, 'action-issue', { contactId: payload.contactId, subject: payload.subject })
        console.log(result.payload)
        break
      case 'action-list':
        result = await callRecipe(lorena, input, { filter: 'all' })
        console.log(result.payload)
        break
      default:
        term.gray('Command "' + input + '" does not exist. For help type "help"\n')
  }
  */

main()
