module.exports = {

  handleError: function(error) {
    if (error.errorCode === '010') {
      return 'Translation limit reached. Please try again tomorrow'
    }
  },

  mathRandom: function() {
    var num = Math.random()
    if (num > 0.8) {
      return true
    }
    return false
  },



}