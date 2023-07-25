var utils = require('./utils')

// only add inputs if they don't bust the target value (aka, exact match)
// worst-case: O(n)
module.exports = {
  blackjackCoin: function (utxos, tokenInputs, outputs, feeRate) {
    if (!isFinite(utils.uintOrNaN(feeRate))) return {}

    var bytesAccum = utils.transactionBytes(tokenInputs, outputs)

    var inAccum = 0
    var inputs = []
    var outAccum = utils.sumOrNaN(outputs)
    var threshold = utils.dustThreshold({}, feeRate)

    for (var i = 0; i < utxos.length; ++i) {
      var input = utxos[i]
      var inputBytes = utils.inputBytes(input)
      var fee = feeRate * (bytesAccum + inputBytes)
      var inputValue = utils.uintOrNaN(input.value)

      // would it waste value?
      if ((inAccum + inputValue) > (outAccum + fee + threshold)) continue

      bytesAccum += inputBytes
      inAccum += inputValue
      inputs.push(input)

      // go again?
      if (inAccum < outAccum + fee) continue

      for (var j = 0; j < tokenInputs.length; ++j) {
        inputs.push(tokenInputs[j])
      }
      return utils.finalize(inputs, outputs, feeRate)
    }

    return { fee: feeRate * bytesAccum }
  },

  blackjackToken: function(tokenUtxos, outputs) {
    var tokenOutputs = outputs.filter(function (output) {
      return output.tokenName
    })

    var inAccum = 0
    var inputs = []
    var outAccum = utils.sumTokenOrNaN(tokenOutputs)

    for (var i = 0; i < tokenUtxos.length; ++i) {
      var input = tokenUtxos[i]
      var inputValue = utils.uintOrNaN(input.token_value)

      if ((inAccum + inputValue) > (outAccum)) continue

      inAccum += inputValue
      inputs.push(input)

      // go again?
      if (inAccum < outAccum) continue

      var remainderToken = inAccum - outAccum
      if (remainderToken > 0) {
        outputs = outputs.concat({ id: 'token_change', tokenName: tokenOutputs[0].tokenName, value: 0, token_value: remainderToken })
      }

      return {
        inputs: inputs,
        outputs: outputs,
      }
    }

    return {}
  }
}