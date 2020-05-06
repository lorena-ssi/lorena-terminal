#!/usr/bin/env node
const Lorena = require('@lorena-ssi/lorena-sdk').default
const Wallet = require('@lorena-ssi/wallet-lib').default

const createWallet = require('./createWallet')
const term = require('./term')
const Commander = require('./Commander')

// Main.
const main = async () => {
  await term.banner('Lorena', 'An awesome framework for Self-Sovereign Identity')
  // Username & password.
  const username = await term.input('Username')
  const password = await term.input('Password')

  // Open Wallet and connect to Lorena
  const lorena = new Lorena(new Wallet(username), { debug: true, silent: true })

  // Open the Wallet. Create a new one if no wallet available.
  if (await lorena.unlock(password)) {
    term.info('Wallet open')
    await lorena.connect()
  } else if (await term.yesOrNo('Wallet does not exist. Create a new wallet?')) {
    await createWallet(lorena, password)
    await lorena.connect()
  } else process.exit()

  // React to messages received.
  lorena.on('message:credential-ask', async (payload) => term.message('Received credential', payload))
  lorena.on('message:action-post', async (payload) => term.message('Received action', payload))
  lorena.on('contact-incoming', async (payload) => term.message('Contact invitation Incoming from', payload))
  lorena.on('contact-added', async (payload) => term.message('Contact invitation Accepted from', payload))
  lorena.on('error', (e) => term.error(e))
  lorena.on('ready', async () => {
    term.info('Lorena ^+connected^')
    await term.ctrlC(lorena)
    const commander = new Commander(lorena)
    commander.run()
  })
}

main()
