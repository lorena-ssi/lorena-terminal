const term = require('../term')

module.exports = class Commander {
  constructor (lorena) {
    this.activeLink = {}
    this.lorena = lorena
    this.history = []
    this.autoComplete = [
      'help', 'info',
      'link', 'link-pubkey',
      'links', 'link-add',
      'link-ping', 'link-ping-admin',
      'link-member-of', 'link-member-of-confirm', 'link-member-list',
      'link-action-issue', 'link-action-update', 'link-credential-add',
      'link-credential-get', 'link-credential-issue', 'link-credential-issued',
      'link-credential-list', 'credential', 'credentials',
      'action-issue', 'save', 'exit'
    ]

    this.commands = {
      help: () => term.array(this.autoComplete),
      info: () => term.json(lorena.wallet.info),
      credential: async () => {
        const issuer = await term.input('issuer')
        term.json(await lorena.wallet.get('credentials', { issuer: issuer }))
      },
      credentials: () => term.json(lorena.wallet.data.credentials ? lorena.wallet.data.credentials : {}),
      links: () => term.json(lorena.wallet.data.links),
      link: async () => {
        const none = 'None'
        const a = lorena.wallet.data.links.map((d) => d.alias)
        const selectedLink = (
          await term.singleColumnMenu(
            a.concat([none])
          )
        ).selectedText
        term.info('Selected link:' + selectedLink)
        if (selectedLink === none) {
          this.activeLink = ''
          return
        }
        const link = await lorena.wallet.get('links', { alias: selectedLink })
        this.activeLink = link
        term.json(link)
      },
      'link-pubkey': async () => {
        if (this.checkActiveLink()) {
          if (this.activeLink.keyPair !== false) {
            term.info('Public Key ', this.activeLink.keyPair[this.activeLink.did].keypair.public_key)
          } else {
            term.info('No Keypair in link `' + this.activeLink.alias + '`')
          }
        }
      },
      'link-add': async () => {
        const did = await term.input('DID (did:lor:labtest:12345)')
        const alias = await term.input('ALIAS (defaultLink)')
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
        if (this.checkActiveLink()) {
          const rolename = await term.input('Rolename')
          term.info(await lorena.memberOf(
            this.activeLink.roomId,
            {},
            rolename
          ))
        }
      },
      'link-member-of-confirm': async () => {
        if (this.checkActiveLink()) {
          const secretCode = await term.input('Secret code')
          term.info(await lorena.memberOfConfirm(
            this.activeLink.roomId,
            secretCode
          ))
        }
      },
      'link-member-list': async () => {
        term.json((await this.callRecipe(lorena, 'member-list', { filter: 'all' })).payload)
      },
      'link-ping': async () => { term.info((await this.callRecipe(lorena, 'ping')).payload) },
      'link-ping-admin': async () => { term.info((await this.callRecipe(lorena, 'ping-admin')).payload) },
      'link-action-issue': async () => {
        term.json(await this.callRecipe(lorena, 'action-issue', {
          contactId: await term.input('ContactId'),
          action: await term.input('Task'),
          description: await term.input('Description'),
          startTime: await term.input('Start Time (2020-04-23 00:00:00)'),
          endTime: await term.input('End Time (2020-04-25 00:00:00)'),
          extra: {}
        }))
      },
      'link-action-update': async () => {
        term.json(await this.callRecipe(lorena, 'action-update', {
          actionId: await term.input('ActionId'),
          status: await term.input('Status (accepted/rejected/done)'),
          extra: await term.input('Comments')
        }))
      },
      'link-action-list': async () => {
        term.json(await this.callRecipe(lorena, 'action-list', { filter: 'all' }))
      },
      'link-credential-add': async () => {
        term.json((await this.callRecipe(lorena, 'credential-add', {
          credential: {
            title: await term.input('title'),
            description: await term.input('description'),
            url: await term.input('url'),
            expiration: 'expires',
            startDate: '2020-04-01',
            endDate: '2020-07-31',
            requirements: await term.input('requirements'),
            type: 'certificate'
          }
        })).payload)
      },
      'link-credential-get': async () => {
        term.json((await this.callRecipe(lorena, 'credential-get', { credentialId: await term.input('credentialId') })).payload)
      },
      'link-credential-issue': async () => {
        term.json((await this.callRecipe(lorena, 'credential-issue', {
          holder: {
            credentialId: await term.input('credentialId'),
            email: await term.input('email'),
            name: await term.input('name')
          }
        })).payload)
      },
      'link-credential-issued': async () => {
        term.json((await this.callRecipe(lorena, 'credential-issued', { credentialId: await term.input('credentialId') })).payload)
      },
      'link-credential-list': async () => {
        term.json((await this.callRecipe(lorena, 'credential-list', { filter: 'certificate' })).payload)
      },
      save: this.save,
      exit: this.shutdown,
      q: this.shutdown,
      default: (command) => term.info(`Command ${command} does not exist. For help type "help"`)
    }
  }

  checkActiveLink () {
    if (Object.entries(this.activeLink).length === 0) {
      term.info('No active link')
      term.info('Please, activate your link with the `link` command')
      return false
    }
    return true
  }

  /**
   * Save changes to wallet
   */
  async save () {
    if (this.lorena.wallet.changed === true) {
      term.info('Saving changes to the wallet')
      while (true) {
        const correct = await this.lorena.lock(await term.input('password'))
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
  async shutdown () {
    await this.save()
    term.message('Good bye!\n\n')
    process.exit()
  }

  async runCommand (command) {
    term.line()
    if (this.commands[command]) {
      try {
        await this.commands[command]()
      } catch (e) {
        term.info('An error occurred')
        term.info(e)
      }
    } else {
      await this.commands.default()
    }
  }

  async run () {
    const { history, autoComplete } = this
    while (true) {
      if (Object.entries(this.activeLink).length === 0) term.lorena('')
      else term.lorena('(' + this.activeLink.alias + ')')
      const command = await term.inputField({ history, autoComplete, autoCompleteMenu: true })
      await this.runCommand(command)
    }
  }

  async callRecipe (recipe, payload = {}, roomId = false, threadId = 0) {
    if (this.checkActiveLink()) {
      const room = await this.lorena.getContact(this.activeLink.roomId)
      if (room !== false) {
        term.info('\n' + JSON.stringify(recipe, null, 2) + '...')
        try {
          const rec = await this.lorena.callRecipe(recipe, payload, room.roomId, threadId)
          const total = (Array.isArray(rec.payload) ? rec.payload.length : 1)
          term(`^+done^ - ${total} results\n`)
          return { roomId: room.roomId, payload: rec.payload, threadId: rec.threadId }
        } catch (e) {
          term.info('Error calling recipe')
          return false
        }
      } else return { payload: ' - room not found\n' }
    }
  }
}
