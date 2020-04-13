#!/usr/bin/env node
const term = require('terminal-kit').terminal

const Lorena = require('@lorena-ssi/lorena-sdk').default
const Wallet = require('@lorena-ssi/wallet-lib').default
const createWallet = require('./createWallet')

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
    term('\n^Is asking for a credential ^')
    term('\n^Share Credential (Y/N) ^\n')
    const shareCredential = await term.yesOrNo({ yes: ['y', 'ENTER'], no: ['n'] }).promise
    if (shareCredential) {
      const cred = lorena.wallet.data.credentials[0]
      console.log(payload)
      lorena.sendAction(payload.threadRef, payload.threadId, 'credential-get', 0, cred, payload.roomId)
      term('\n^Credential Sent^\n')
    }
  })

  // Someone sent a credential to us.
  lorena.on('message:credential-ask', async (payload) => {
    term('\n^Received credential ^')
    console.log(payload)
  })

  // We received a new Action.
  lorena.on('message:action-post', async (payload) => {
    term('\n^Received action ^')
    console.log(payload)
  })

  // Someone¡'s contacting with us.
  lorena.on('contact-incoming', (payload) => {
    term('\n^+Contact invitation Incoming from ^' + payload + ' \n')
  })

  // A new contact has been added (accepted).
  lorena.on('contact-added', (payload) => {
    term('\n^+Contact invitation Accepted from ^' + payload + ' \n')
  })
}

/**
 * Calls a remote recipe.
 *
 * @param {object} lorena Lorena Object
 * @param {string} recipe Recipe Ref to be called
 * @param {object} payload Payload
 * @param {string} roomId roomId
 * @param {number} threadId recipe identifier
 * @returns {Promise} result of calling recipe
 */
const callRecipe = (lorena, recipe, payload = {}, roomId = false, threadId = 0) => {
  return new Promise((resolve) => {
    const promise = (roomId === false) ? term.gray('\nRoomId : ').inputField().promise : Promise.resolve(roomId)
    promise
      .then((roomId) => { return lorena.getContact(roomId) })
      .then((room) => {
        if (room !== false) {
          term.gray('\n' + recipe + '...')
          lorena.callRecipe(recipe, payload, room.roomId, threadId)
            .then((result) => {
              const total = (Array.isArray(result.payload) ? result.payload.length : 1)
              term('^+done^ - ' + total + ' results\n')
              resolve({ roomId: room.roomId, payload: result.payload, threadId: result.threadId })
            })
            .catch((error) => {
              term.gray(`^+${error.message}^\n`)
              resolve(false)
            })
        } else resolve({ payload: ' - room not found\n' })
      })
  })
}

const runCommand = async (command, autoComplete, lorena, wallet) => {
  term('\n')
  const commands = {
    help: () => console.log(autoComplete),
    info: () => console.log(wallet.info),
    did: () => term.gray('DID : ').white(wallet.info.did + '\n'),
    credential: () => console.log(wallet.data.credentials['0'] ? wallet.data.credentials['0'] : 'empty'),
    credentials: () => console.log(wallet.data.credentials ? wallet.data.credentials : 'empty'),
    'credential-member': () => console.log(wallet.data.credentials['0'] ? wallet.data.credentials['0'].credentialSubject.member : 'empty'),
    rooms: () => console.log(wallet.data.contacts),
    room: async () => {
      const roomId = await term.gray('\nroomId : ').inputField().promise
      const room = await wallet.get('contacts', { roomId: roomId })
      console.log(room)
    },
    pubkey: () => term.gray('Public Key :  : ').white(wallet.info.keyPair[wallet.info.username].keypair.public_key + '\n'),
    'room-add': async () => {
      const did = await term.gray('DID : ').inputField().promise
      const matrix = await term.gray('\nmatrix : ').inputField().promise
      const created = await lorena.createConnection(matrix, did)
      term('\n' + (created ? 'Successfull' : 'Error') + '\n')
    },
    'member-of': async () => { await lorena.memberOf(await term.gray('\nroomId : ').inputField().promise, await term.gray('\nExtra : ').inputField().promise, await term.gray('\nRolename : ').inputField().promise) },
    'member-of-confirm': async () => { term(await lorena.memberOfConfirm(await term.gray('\nroomId : ').inputField().promise, await term.gray('\nSecret code : ').inputField().promise)) },
    'member-list': async () => { console.log((await callRecipe(lorena, 'member-list', { filter: 'all' })).payload) },
    ping: async () => { console.log((await callRecipe(lorena, 'ping')).payload) },
    'ping-admin': async () => { console.log((await callRecipe(lorena, 'ping-admin')).payload) },
    q: async () => {
      if (lorena.wallet.changed === true) {
        term.gray('\nChanges to the conf file\npassword : ')
        await lorena.lock(await term.inputField().promise)
      }
      term('\n^+Good bye!^\n\n')
      process.exit()
    },
    default: () => term.gray('Command "' + command + '" does not exist. For help type "help"\n')
  }

  // return new Promise((resolve) => {
  // invoke it
  if (commands[command]) {
    await commands[command]()
  } else {
    await commands.default()
  }
  // resolve()
  // })
}

/**
 * Opens the terminal
 *
 * @param {object} lorena Lorena Object
 * @param {object} wallet Local information (wallet)
 */
function terminal (lorena, wallet) {
  const history = []
  const autoComplete = ['help', 'info', 'member-of', 'member-of-confirm', 'member-list', 'credential', 'credential-member', 'pubkey', 'ping', 'ping-admin', 'ping-remote', 'room', 'rooms', 'room-add', 'room-info', 'action-issue', 'exit']
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
