var utils = require('./utils')

// add inputs until we reach or surpass the target value (or deplete)
// worst-case: O(n)
module.exports = {
  accumulativeCoin: function (utxos, tokenInputs, outputs, feeRate) {
    if (!isFinite(utils.uintOrNaN(feeRate))) return {}
    var bytesAccum = utils.transactionBytes(tokenInputs, outputs)

    var inAccum = 0
    var inputs = []
    var outAccum = utils.sumOrNaN(outputs)

    for (var i = 0; i < utxos.length; ++i) {
      var utxo = utxos[i]
      var utxoBytes = utils.inputBytes(utxo)
      var utxoFee = feeRate * utxoBytes
      var utxoValue = utils.uintOrNaN(utxo.value)

      // skip detrimental input
      if (utxoFee > utxo.value) {
        if (i === utxos.length - 1) return { fee: feeRate * (bytesAccum + utxoBytes) }
        continue
      }

      bytesAccum += utxoBytes
      inAccum += utxoValue
      inputs.push(utxo)

      var fee = feeRate * bytesAccum

      // go again?
      if (inAccum < outAccum + fee) continue

      for (var j = 0; j < tokenInputs.length; ++j) {
        inputs.push(tokenInputs[j])
      }
      return utils.finalize(inputs, outputs, feeRate)
    }

    return { fee: feeRate * bytesAccum }
  },

  accumulativeToken: function(tokenUtxos, outputs) {
    var tokenOutputs = outputs.filter(function (output) {
      return output.tokenName
    })
    console.log('TACA ===> accumulativeToken, tokenUtxos = ', tokenUtxos, ', outputs = ', outputs, ', tokenOutputs = ', tokenOutputs)

    var inAccum = 0
    var inputs = []
    var outAccum = utils.sumTokenOrNaN(tokenOutputs)

    for (var i = 0; i < tokenUtxos.length; ++i) {
      var utxo = tokenUtxos[i]
      var utxoValue = utils.uintOrNaN(utxo.token_value)

      inAccum += utxoValue
      inputs.push(utxo)

      // go again?
      if (inAccum < outAccum) continue

      var remainderToken = inAccum - outAccum
      console.log('TACA ===> accumulativeToken, inAccum = ', inAccum, ', outAccum = ', outAccum, ', remainderToken = ', remainderToken)
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