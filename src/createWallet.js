const term = require('terminal-kit').terminal
const Credential = require('@lorena-ssi/credential-lib')

/**
 * Creates a new wallet.
 *
 * @param {object} lorena Lorena SDK
 * @param {object} wallet Identity Wallet
 * @param {string} password Password
 */
const createWallet = async (lorena, wallet, password) => {
  await lorena.initWallet('labtest')
  term.cyan('\nKey Pair + DID Added')

  // Personal information
  const person = new Credential.Person(wallet.info.did)
  const user = {}
  term.gray('\nFirst Name :')
  user.givenName = await term.inputField().promise
  term.gray('\nLast Name (1) :')
  user.familyName = await term.inputField().promise
  term.gray('\nLast Name (2) :')
  user.additionalName = await term.inputField().promise
  person.fullName(user.givenName, user.familyName, user.additionalName)
  term.gray('\nDNI :')
  person.nationalID(await term.inputField().promise, 'Documento Nacional de Identidad de España')
  term.gray('\nPhone number :')
  person.telephone(await term.inputField().promise)
  term.gray('\nEmail :')
  person.email(await term.inputField().promise)

  // Location.
  const location = new Credential.Location()
  term.gray('\nCity/Town :')
  location.addressLocality(await term.inputField().promise)
  term.gray('\nPostal Code :')
  location.postalCode(await term.inputField().promise)
  term.gray('\nNeighborhood :')
  location.neighborhood(await term.inputField().promise)
  person.location(location)

  await lorena.signCredential(person)
  term.cyan('\nSave Storage\n\n')
  await lorena.lock(password)
}

module.exports = createWallet
