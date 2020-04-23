#!/usr/bin/env node
const Lorena = require('@lorena-ssi/lorena-sdk').default
const Wallet = require('@lorena-ssi/wallet-lib').default
const createWallet = require('./createWallet')
const runCommand = require('./runCommand')
const term = require('./term')

// Main.
const main = async () => {
  await term.banner('Lorena', 'An awesome framework for Self-Sovereign Identity')
  // Username & password.
  const username = await term.input('Username')
  const password = await term.input('Password')

  // Open Wallet and connect to Lorena
  const wallet = new Wallet(username)
  const lorena = new Lorena(wallet, { debug: true, silent: true })

  // Open the Wallet. Create a new one if no wallet available.
  if (await lorena.unlock(password)) {
    term.info('Wallet open')
    await lorena.connect()
  } else if (await term.yesOrNo('Wallet does not exist. Create a new wallet?')) {
    await createWallet(lorena, wallet, password)
    await lorena.connect()
  } else process.exit()

  // Someone's asking for a credential we have.
  lorena.on('message:credential-get', async (payload) => {
    term.message('Is asking for a credential')
    if (await term.yesOrNo('Share Credential?')) {
      const cred = lorena.wallet.data.credentials[0]
      console.log(payload)
      lorena.sendAction('credential-ask', payload.threadId, 'credential-get', 0, cred, payload.roomId)
      term.message('Credential Sent')
    }
  })

  // React to messages received.
  lorena.on('message:credential-ask', async (payload) => term.message('Received credential', payload))
  lorena.on('message:action-post', async (payload) => term.message('Received action', payload))
  lorena.on('contact-incoming', async (payload) => term.message('Contact invitation Incoming from', payload))
  lorena.on('contact-added', async (payload) => term.message('Contact invitation Accepted from', payload))
  lorena.on('error', (e) => term.error(e))
  lorena.on('ready', async () => {
    term.info('Lorena ^+connected^')
    terminal(lorena, wallet)
  })
}

/**
 * Opens the terminal
 *
 * @param {object} lorena Lorena Object
 * @param {object} wallet Local information (wallet)
 */
function terminal (lorena, wallet) {
  const history = []
  const autoComplete = [
    'help', 'info',
    'link', 'link-pubkey',
    'links', 'link-add',
    'link-ping', 'link-ping-admin',
    'link-member-of', 'link-member-of-confirm', 'link-member-list',
    'link-action-issue', 'link-action-update',
    'credential', 'credentials',
    'action-issue', 'exit']
  term.lorena()
  term.inputField({ history, autoComplete, autoCompleteMenu: true })
    .then(async (input) => {
      await runCommand(input, autoComplete, lorena, wallet)
      terminal(lorena, wallet)
    })
}

main()
