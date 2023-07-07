// baseline estimates, used to improve performance
/*
Version: 4 bytes
Time: 8 bytes
Input Count: 1 byte
Output Count: 1 byte
Locktime: 4 bytes
*/
var TX_EMPTY_SIZE = 4 + 8 + 1 + 1 + 4

/*
TXID: 32 bytes
vout: 4 bytes
ScriptSig Size: 1 byte
Sequence: 4 bytes
*/
var TX_INPUT_BASE = 32 + 4 + 1 + 4

/*
containing scriptSig
Example: 47304402203af1898fce7bad1085ab1310c28aafa9364ff297bb701156c13ef0c69ea0ed14022015b0b4155c67673a0cf27630df87783af64962aa5ef445206a44456ace225af001210233da57392c7a36d79a609e93394b9ee6775ddd8813cbd500b71d8339610f1c2a
*/
var TX_INPUT_PUBKEYHASH = 107

/*
Value: 8 bytes
ScriptPubKey Size: 1 byte
*/
var TX_OUTPUT_BASE = 8 + 1

/*
OP_DUP
OP_HASH160
1 bytes for length of hash public key
20 bytes for <hash_of_public_key>
OP_EQUALVERIFY
OP_CHECKSIG
Example: 76a9148fdd9d10a0bebe6bf3a89139f8b830a04c70d06088ac
*/
var TX_OUTPUT_PUBKEYHASH = 25

function inputBytes (input) {
  // Old formular is not correct because when this function is called input.script is the unsigned script, not the signed script
  // return TX_INPUT_BASE + (input.script ? input.script.length : TX_INPUT_PUBKEYHASH)
  return TX_INPUT_BASE + TX_INPUT_PUBKEYHASH
}

function outputBytes (output) {
  return TX_OUTPUT_BASE + (output.script ? output.script.length : TX_OUTPUT_PUBKEYHASH)
}

function dustThreshold (output, feeRate) {
  /* ... classify the output for input estimate  */
  return inputBytes({}) * feeRate
}

function transactionBytes (inputs, outputs) {
  return TX_EMPTY_SIZE +
    inputs.reduce(function (a, x) { return a + inputBytes(x) }, 0) +
    outputs.reduce(function (a, x) { return a + outputBytes(x) }, 0)
}

function uintOrNaN (v) {
  if (typeof v !== 'number') return NaN
  if (!isFinite(v)) return NaN
  if (Math.floor(v) !== v) return NaN
  if (v < 0) return NaN
  return v
}

function sumForgiving (range) {
  return range.reduce(function (a, x) { return a + (isFinite(x.value) ? x.value : 0) }, 0)
}

function sumOrNaN (range) {
  return range.reduce(function (a, x) { return a + uintOrNaN(x.value) }, 0)
}

function sumTokenOrNaN (range) {
  return range.reduce(function (a, x) { return a + uintOrNaN(x.token_value) }, 0)
}

var BLANK_OUTPUT = outputBytes({})

function finalize (inputs, outputs, feeRate) {
  var bytesAccum = transactionBytes(inputs, outputs)
  var feeAfterExtraOutput = feeRate * (bytesAccum + BLANK_OUTPUT)
  var remainderAfterExtraOutput = sumOrNaN(inputs) - (sumOrNaN(outputs) + feeAfterExtraOutput)

  // is it worth a change output?
  if (remainderAfterExtraOutput > dustThreshold({}, feeRate)) {
    outputs = outputs.concat({ id: 'coin_change', value: remainderAfterExtraOutput })
  }

  var fee = sumOrNaN(inputs) - sumOrNaN(outputs)
  if (!isFinite(fee)) return { fee: feeRate * bytesAccum }

  return {
    inputs: inputs,
    outputs: outputs,
    fee: fee
  }
}

module.exports = {
  dustThreshold: dustThreshold,
  finalize: finalize,
  inputBytes: inputBytes,
  outputBytes: outputBytes,
  sumOrNaN: sumOrNaN,
  sumTokenOrNaN: sumTokenOrNaN,
  sumForgiving: sumForgiving,
  transactionBytes: transactionBytes,
  uintOrNaN: uintOrNaN
}
