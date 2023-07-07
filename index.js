var accumulative = require('./accumulative')
var blackjack = require('./blackjack')
var utils = require('./utils')

// order by descending value, minus the inputs approximate fee
function utxoScore (x, feeRate) {
  return x.value - (feeRate * utils.inputBytes(x))
}

module.exports = function coinSelect (utxos, tokenUtxos, outputs, feeRate) {
  console.log('TACA ===> yacoinjs-coinselect, utxos = ', utxos, ', tokenUtxos = ', tokenUtxos, ', outputs = ', outputs, ', feeRate = ', feeRate)
  utxos = utxos.concat().sort(function (a, b) {
    return utxoScore(b, feeRate) - utxoScore(a, feeRate)
  })

  // Select tokens inputs
  let tokenInputs = []
  if (tokenUtxos && tokenUtxos.length > 0) {
    tokenUtxos = tokenUtxos.concat().sort(function (a, b) {
      return b.value - a.value
    })

    // Select tokens inputs based on blackjack strategy first (no change output)
    var retObject = blackjack.blackjackToken(tokenUtxos, outputs)
    // else, try the accumulative strategy
    if (!retObject.inputs) {
      retObject = accumulative.accumulativeToken(tokenUtxos, outputs)
    }

    if (!retObject.inputs) {
      return {}
    } else {
      tokenInputs = retObject.inputs
      outputs = retObject.outputs
    }
  }

  // attempt to use the blackjack strategy first (no change output)
  var base = blackjack.blackjackCoin(utxos, tokenInputs, outputs, feeRate)
  if (base.inputs) return base

  // else, try the accumulative strategy
  return accumulative.accumulativeCoin(utxos, tokenInputs, outputs, feeRate)
}
