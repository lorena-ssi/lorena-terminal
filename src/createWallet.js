const term = require('./term')
const Credential = require('@lorena-ssi/credential-lib')

/**
 * Creates a new wallet.
 *
 * @param {object} lorena Lorena SDK
 * @param {string} password Password
 */
const createWallet = async (lorena, password) => {
  const network = await term.input('Network (labdev)')
  await lorena.initWallet(network)

  // Personal information
  const person = new Credential.Person()
  person.fullName(
    await term.input('First Name'),
    await term.input('Last Name (1)'),
    await term.input('Last Name (2)'))
  person.nationalID(await term.input('DNI'), 'Documento Nacional de Identidad de España')
  person.telephone(await term.input('Phone number'))
  person.email(await term.input('Email'))

  // Location.
  const location = new Credential.Location()
  location.addressLocality(await term.input('City/Town'))
  location.postalCode(await term.input('Postal Code'))
  location.neighborhood(await term.input('Neighborhood'))
  person.location(location)

  // Save wallet.
  term.info('Save Storage')
  lorena.personalData(person)
  await lorena.lock(password)
}

module.exports = createWallet
