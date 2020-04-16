const term = require('./term')
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

  // Personal information
  const person = new Credential.Person(wallet.info.did)
  person.fullName(
    await term.input('First Name'),
    await term.input('Last Name (1)'),
    await term.input('Last Name (2)'))
  person.nationalID(await term.input('DNI'), 'Documento Nacional de Identidad de España')
  person.telephone(await term.input('nPhone number'))
  person.email(await term.input('Email'))

  // Location.
  const location = new Credential.Location()
  location.addressLocality(await term.input('City/Town'))
  location.postalCode(await term.input('Postal Code'))
  location.neighborhood(await term.input('Neighborhood'))
  person.location(location)

  // Savce wallet.
  term.info('Save Storage')
  lorena.personalData(person)
  await lorena.lock(password)
}

module.exports = createWallet
