import { promises as fsPromises } from 'fs'

const importWallet = async (path) => {
  try {
    const data = await fsPromises.readFile(path, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    throw new Error(error)
  }
}

const exportWallet = async (path, json) => {
  try {
    await fsPromises.writeFile(path, json)
    return true
  } catch (error) {
    throw new Error(error)
  }
}

module.exports = {
  importWallet,
  exportWallet
}
