module.exports = {

  handleError: function(error) {
    if (error.errorCode === '010') {
      return 'Translation limit reached. Please try again tomorrow'
    }
    return 'Translation service error. Please try again later.'
  },

  mathRandom: function() {
    var num = Math.random()
    if (num > 0.8) {
      return true
    }
    return false
  },



}