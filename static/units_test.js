var goodEvaluations = [
  ["1", "1"],
  ["1 + 1", "2"],
  ["1 + 2", "3"],
  ["1 * 1", "1"],
  ["1 * 2", "2"],
  ["5 * 10", "50"],
  ["-1 * 1", "-1"],
  ["1 - 3", "-2"],
  ["1 / 5", "0.2"],
  ["35 / 5", "7"],
  ["1 * 2 + 3", "5"],
  ["2 * 3 + 1", "7"],
  ["2 * (3 + 1)", "8"],
  ["1km", "1000m"],
  ["1000m", "1km"],
  ["1m * 1000", "1km"],
  ["1km / 1km", "1"],
  ["(1km * 1km) / (1m * 1m)", "1,000,000"],
  ["(2 MB / 1 s) * 1 day", "172.8 gigabytes"],
//   ["2MB per s", "2 MB / 1 s"],
  ["1Hz", "1 / 1s"]
];

var desiredOutput = [
  
]

var shouldParse = [
  "1",
  "1 + 1",
  "1 * 1",
  "1 + 1 * 1"
]

var shouldntEvaluate = [
  "1m + 1",
  "1km - 1s"
]

var invalidQueries = [];

function runUnitsTests() {
  for (var i = 0; i < shouldParse.length; i++) {
    var parsed = units.parseExpression(shouldParse[i]);
    assertNotEquals(parsed, null, "unable to parse " + shouldParse[i]);
    assertNotEquals(parsed, undefined, "unable to parse " + shouldParse[i]);
  }
  
  for (var i = 0; i < goodEvaluations.length; i++) {
    var input = goodEvaluations[i][0];
    var expected = goodEvaluations[i][1];
    var val = units.parseExpression(input).evaluate();
    var expectedVal = units.parseExpression(expected).evaluate();
    assertAboutEquals(val, expectedVal);
  }
  
  for (var i = 0; i < shouldntEvaluate.length; i++) {
    var badInput = shouldntEvaluate[i];
    var parsed = units.parseExpression(badInput);
    try {
      var val = parsed.evaluate();
    } catch(e) {
      //pass
      continue;
    }
    throw new Error("`" + badInput + "` should yield an error, got: " + val);
  }
}

function assertAboutEquals(a, b, msg) {
  if (!a.aboutEquals(b)) {
    throw new Error(a + " should be nearly equal " + b);
  }
}
function assertNotEquals(a, b, msg) {
  if (a === b) {
    throw new Error(msg || a + " should not be equal to " + b)
  }
}