const term = require('./term')
const callRecipe = require('./callRecipe')

const runCommand = async (command, autoComplete, lorena, wallet) => {
  /**
   * Save changes to wallet
   */
  const save = async () => {
    if (lorena.wallet.changed === true) {
      term.info('Saving changes to the wallet')
      while (true) {
        const correct = await lorena.lock(await term.input('password'))
        if (!correct) {
          term.message('Incorrect password, try again')
          term.info('\n')
        } else {
          term.info('Everything has been saved correctly')
          break
        }
      }
    } else term.info('Nothing to save')
  }

  /**
   * Shut down the terminal, prompting to save
   */
  const shutdown = async () => {
    await save()
    term.message('Good bye!\n\n')
    process.exit()
  }

  const commands = {
    help: () => term.array(autoComplete),
    info: () => term.json(wallet.info),
    credential: async () => {
      const issuer = await term.input('issuer')
      term.json(await wallet.get('credentials', { issuer: issuer }))
    },
    'credential-get': async () => {
      term.info((await callRecipe(lorena, 'credential-get', { credentialType: 'memberOf' })).payload)
    },
    credentials: () => term.json(wallet.data.credentials ? wallet.data.credentials : {}),
    links: () => term.json(wallet.data.links),
    link: async () => {
      const a = wallet.data.links.map((d) => d.roomId)
      const selectedLink = (
        await term.singleColumnMenu(
          a.concat(['None'])
        )
      ).selectedText
      term.info('Selected link:\n' + selectedLink)
      const link = await wallet.get('links', { roomId: selectedLink })
      term.json(link)
    },
    'link-pubkey': async () => {
      const roomId = await term.input('roomId')
      const link = await wallet.get('links', { roomId: roomId })
      term.info('Public Key ', link.keyPair[link.did].keypair.public_key)
    },
    'link-add': async () => {
      const did = await term.input('DID (did:lor:labtest:12345)')
      const alias = await term.input('ALIAS (myBossChuck)')
      term.info(`Adding link ${did} with alias ${alias}`)
      const created = await lorena.createConnection(
        did,
        undefined,
        { alias }
      )
      if (created) term.info('Created room', created)
      else term.error('\nError\n')
    },
    'link-member-of': async () => {
      term.info(await lorena.memberOf(
        await term.input('roomId'),
        {},
        await term.input('Rolename')))
    },
    'link-member-of-confirm': async () => {
      term.info(await lorena.memberOfConfirm(
        await term.input('roomId'),
        await term.input('Secret code')))
    },
    'link-member-list': async () => { term.json((await callRecipe(lorena, 'member-list', { filter: 'all' })).payload) },
    'link-ping': async () => { term.info((await callRecipe(lorena, 'ping')).payload) },
    'link-ping-admin': async () => { term.info((await callRecipe(lorena, 'ping-admin')).payload) },
    'link-action-issue': async () => {
      term.json(await callRecipe(lorena, 'action-issue', {
        contactId: await term.input('ContactId'),
        action: await term.input('Task'),
        description: await term.input('Description'),
        startTime: await term.input('Start Time (2020-04-23 00:00:00)'),
        endTime: await term.input('End Time (2020-04-25 00:00:00)'),
        extra: {}
      }))
    },
    'link-action-update': async () => {
      term.json(await callRecipe(lorena, 'action-update', {
        actionId: await term.input('ActionId'),
        status: await term.input('Status (accepted/rejected/done)'),
        extra: await term.input('Comments')
      }))
    },
    'link-action-list': async () => {
      term.json(await callRecipe(lorena, 'action-list', { filter: 'all' }))
    },
    save: save,
    exit: shutdown,
    q: shutdown,
    default: () => term.info(`Command ${command} does not exist. For help type "help"`)
  }

  term.line()
  if (commands[command]) {
    try {
      await commands[command]()
    } catch (e) {
      term.info('An error occurred')
      term.info(e)
    }
  } else {
    await commands.default()
  }
}

module.exports = runCommand
