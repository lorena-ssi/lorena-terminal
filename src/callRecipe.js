const term = require('terminal-kit').terminal

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

module.exports = callRecipe
